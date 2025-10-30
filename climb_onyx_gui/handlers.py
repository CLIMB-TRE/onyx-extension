import os
import json
from pathlib import Path
import boto3
import tornado
from tornado.httpclient import AsyncHTTPClient
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from ._version import __version__
from .exceptions import (
    ValidationError,
    AuthenticationError,
    BadGatewayError,
    GatewayTimeoutError,
)
from .validators import validate_s3_uri, validate_filename, validate_content
from .decorators import handle_api_errors, async_handle_api_errors


PLUGIN_NAME = "climb-onyx-gui"
ONYX_DOMAIN = os.environ.get("ONYX_DOMAIN")
ONYX_TOKEN = os.environ.get("ONYX_TOKEN")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
JUPYTERLAB_S3_ENDPOINT = os.environ.get("JUPYTERLAB_S3_ENDPOINT")
S3_DOWNLOADS_DIR = "./s3_downloads"


class WidgetEnabledHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    def get(self):
        # Check for credentials to determine access to Onyx
        enabled = True if ONYX_DOMAIN and ONYX_TOKEN else False

        # Return whether Onyx is enabled
        self.finish(json.dumps({"enabled": enabled}))


class S3ViewHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    def get(self):
        # Validate S3 URI
        bucket_name, key = validate_s3_uri(self.get_query_argument("uri"))

        # Validate credentials
        if not (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and JUPYTERLAB_S3_ENDPOINT):
            raise AuthenticationError(
                "Cannot connect to S3: JupyterLab environment does not have credentials"
            )

        # Retrieve S3 object
        s3 = boto3.resource(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            endpoint_url=JUPYTERLAB_S3_ENDPOINT,
        )
        s3_object = s3.Object(bucket_name=bucket_name, key=key)  # type: ignore

        # Create s3_downloads directory to store objects (if it doesn't exist)
        Path(S3_DOWNLOADS_DIR).mkdir(parents=True, exist_ok=True)

        # Download the object
        path = os.path.join(S3_DOWNLOADS_DIR, key)
        with open(path, "wb") as fp:
            s3_object.download_fileobj(fp)

        # Return the path to the file
        self.finish(json.dumps({"path": path}))


class RedirectingRouteHandler(APIHandler):
    @tornado.web.authenticated
    @async_handle_api_errors
    async def get(self):
        # Validate credentials
        if not (ONYX_DOMAIN and ONYX_TOKEN):
            raise AuthenticationError(
                "Cannot connect to Onyx: JupyterLab environment does not have credentials"
            )

        # Validate route
        route = self.get_query_argument("route")

        if not route:
            raise ValidationError("Route is required")

        # Request for the Onyx API
        request = url_path_join(ONYX_DOMAIN, route)

        # Usage of the AsyncHTTPClient is necessary to avoid blocking tornado event loop
        # https://www.tornadoweb.org/en/stable/guide/async.html
        client = AsyncHTTPClient()
        try:
            response = await client.fetch(
                request,
                raise_error=False,
                headers={"Authorization": f"Token {ONYX_TOKEN}"},
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
    def get(self):
        # Return the version of the package
        self.finish(json.dumps({"version": __version__}))


class FileWriteHandler(APIHandler):
    @tornado.web.authenticated
    @handle_api_errors
    def post(self):
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

    route_pattern = url_path_join(base_url, PLUGIN_NAME, "widget-enabled")
    handlers = [(route_pattern, WidgetEnabledHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, PLUGIN_NAME, "s3")
    handlers = [(route_pattern, S3ViewHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, PLUGIN_NAME, "reroute")
    handlers = [(route_pattern, RedirectingRouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, PLUGIN_NAME, "version")
    handlers = [(route_pattern, VersionHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, PLUGIN_NAME, "file-write")
    handlers = [(route_pattern, FileWriteHandler)]
    web_app.add_handlers(host_pattern, handlers)
