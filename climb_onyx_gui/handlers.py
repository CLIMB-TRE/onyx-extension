import os
import json
import re
from pathlib import Path
import requests
import tornado
import boto3
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from ._version import __version__
from .exceptions import APIError, ValidationError, AuthenticationError


class S3ViewHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            # Validate S3 URI
            uri = self.get_query_argument("uri")

            if not uri:
                raise ValidationError("S3 URI is required")

            match = re.match(r"s3://(.*)/(.*)", uri)

            if not match:
                raise ValidationError(f"Invalid S3 URI: {uri}")

            bucket_name = match.group(1)
            key = match.group(2)

            if not bucket_name:
                raise ValidationError(f"S3 bucket name not found: {uri}")

            if not key:
                raise ValidationError(f"S3 key not found: {uri}")

            # Retrieve S3 object
            s3 = boto3.resource(
                "s3",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
                endpoint_url=os.environ["JUPYTERLAB_S3_ENDPOINT"],
            )
            s3_object = s3.Object(bucket_name=bucket_name, key=key)  # type: ignore

            # Create directory to store object (if it doesn't exist)
            Path("./s3_downloads").mkdir(parents=True, exist_ok=True)

            # Download the object
            path = f"./s3_downloads/{key}"
            with open(path, "wb") as fp:
                s3_object.download_fileobj(fp)

            self.finish(json.dumps({"path": path}))

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class RedirectingRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            # Validate domain
            domain = os.environ.get("ONYX_DOMAIN")

            if not domain:
                raise AuthenticationError("Domain is required to connect to Onyx")
            else:
                domain = domain.removesuffix("/")

            # Validate token
            token = os.environ.get("ONYX_TOKEN")

            if not token:
                raise AuthenticationError("Token is required to connect to Onyx")

            # Make the request and return the response
            route = self.get_query_argument("route")
            endpoint = f"{domain}/{route}"
            response = requests.get(
                endpoint, headers={"Authorization": f"Token {token}"}
            )
            self.finish(response.content)

        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class VersionHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            self.finish(json.dumps({"version": __version__}))
        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))


class FileWriteHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            # Validate path
            path = self.get_query_argument("path")

            if not path:
                raise ValidationError("Path is required")

            # Validate content
            input_data = self.get_json_body()
            if not input_data:
                raise ValidationError("Input data is required")

            content = input_data["content"]

            # Create directory to store content (if it doesn't exist)
            Path(path).parent.mkdir(parents=True, exist_ok=True)

            # Write content to file
            with open(path, "w", encoding="utf-8") as fp:
                fp.write(content)

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
