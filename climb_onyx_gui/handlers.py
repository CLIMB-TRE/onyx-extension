import os
import json
from pathlib import Path
import functools
import boto3
import tornado
from tornado.httpclient import AsyncHTTPClient
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from ._version import __version__
from .exceptions import (
    APIError,
    ValidationError,
    AuthenticationError,
    BadGatewayError,
    GatewayTimeoutError,
)
from .validators import validate_s3_uri, validate_filename, validate_content


def handle_api_errors(func):
    @functools.wraps(func)
    async def wrapper(self, *args, **kwargs):
        try:
            return await func(self, *args, **kwargs)
        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))

    return wrapper


class WidgetEnabledHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    async def get(self):
        # Check for credentials to determine access to Onyx
        domain = os.environ.get("ONYX_DOMAIN")
        token = os.environ.get("ONYX_TOKEN")
        enabled = True if domain and token else False

        # Return whether Onyx is enabled
        self.finish(json.dumps({"enabled": enabled}))


class S3ViewHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    async def get(self):
        # Validate S3 URI
        bucket_name, key = validate_s3_uri(self.get_query_argument("uri"))

        # Validate credentials
        aws_access_key_id = os.environ.get("AWS_ACCESS_KEY_ID")
        aws_secret_access_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        endpoint_url = os.environ.get("JUPYTERLAB_S3_ENDPOINT")

        if not aws_access_key_id or not aws_secret_access_key or not endpoint_url:
            raise AuthenticationError(
                "Cannot connect to S3: JupyterLab environment does not have credentials"
            )

        # Retrieve S3 object
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            endpoint_url=endpoint_url,
        )
        s3_object = s3.Object(bucket_name=bucket_name, key=key)  # type: ignore

        # Create s3_downloads directory to store objects (if it doesn't exist)
        Path("./s3_downloads").mkdir(parents=True, exist_ok=True)

        # Download the object
        path = f"./s3_downloads/{key}"
        with open(path, "wb") as fp:
            s3_object.download_fileobj(fp)

        # Return the path to the file
        self.finish(json.dumps({"path": path}))


class RedirectingRouteHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    async def get(self):
        # Validate credentials
        domain = os.environ.get("ONYX_DOMAIN")
        token = os.environ.get("ONYX_TOKEN")

        if not domain or not token:
            raise AuthenticationError(
                "Cannot connect to Onyx: JupyterLab environment does not have credentials"
            )

        # Validate route
        route = self.get_query_argument("route")

        if not route:
            raise ValidationError("Route is required")

        # Request for the Onyx API
        request = url_path_join(domain, route)

        # Usage of the AsyncHTTPClient is necessary to avoid blocking tornado event loop
        # https://www.tornadoweb.org/en/stable/guide/async.html
        client = AsyncHTTPClient()
        try:
            response = await client.fetch(
                request,
                raise_error=False,
                headers={"Authorization": f"Token {token}"},
            )
        except ConnectionRefusedError:
            raise BadGatewayError("Failed to connect to Onyx: Connection refused")
        except TimeoutError:
            raise GatewayTimeoutError("Failed to connect to Onyx: Gateway timeout")
        else:
            self.finish(response.body)


class VersionHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    async def get(self):
        # Return the version of the package
        self.finish(json.dumps({"version": __version__}))


class FileWriteHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    async def post(self):
        # Validate path and content
        path = validate_filename(self.get_query_argument("path"))
        content = validate_content(self.get_json_body())

        # Write content to file
        with open(path, "w", encoding="utf-8") as fp:
            fp.write(content)

        # Return the path to the file
        self.finish(json.dumps({"path": path}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    route_pattern = url_path_join(base_url, "climb-onyx-gui", "widget-enabled")
    handlers = [(route_pattern, WidgetEnabledHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "climb-onyx-gui", "s3")
    handlers = [(route_pattern, S3ViewHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "climb-onyx-gui", "reroute")
    handlers = [(route_pattern, RedirectingRouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "climb-onyx-gui", "version")
    handlers = [(route_pattern, VersionHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "climb-onyx-gui", "file-write")
    handlers = [(route_pattern, FileWriteHandler)]
    web_app.add_handlers(host_pattern, handlers)
