import os
import json
from pathlib import Path
import requests
import tornado
import boto3
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from ._version import __version__
from .exceptions import APIError, ValidationError, AuthenticationError
from .validators import validate_s3_uri, validate_filename, validate_content


class S3ViewHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
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

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class RedirectingRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
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

            # Make the request to the Onyx API and return the response
            endpoint = f"{domain.removesuffix('/')}/{route}"
            response = requests.get(
                endpoint, headers={"Authorization": f"Token {token}"}
            )

            # Return the response content
            self.finish(response.content)

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class VersionHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            # Return the version of the package
            self.finish(json.dumps({"version": __version__}))

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class FileWriteHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            # Validate path and content
            path = validate_filename(self.get_query_argument("path"))
            content = validate_content(self.get_json_body())

            # Write content to file
            with open(path, "w", encoding="utf-8") as fp:
                fp.write(content)

            # Return the path to the file
            self.finish(json.dumps({"path": path}))

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

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
