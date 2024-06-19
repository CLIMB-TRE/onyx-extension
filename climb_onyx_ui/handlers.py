import os
import json
import re
import requests
import tempfile
from pathlib import Path

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import boto3
from ._version import __version__

class S3ViewHandler(APIHandler):

    def _copy_s3_file(self, s3name:str)->str:
        m = re.match(r's3://(.*)/(.*)', s3name)
        b = m.group(1)
        o = m.group(2)

        s3 = boto3.resource(
            "s3",
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            endpoint_url=os.environ["JUPYTERLAB_S3_ENDPOINT"],
            )
        s3_object=s3.Object(b,o)
        Path("./s3_downloads").mkdir(parents=True, exist_ok=True)
        with open(f'./s3_downloads/{o}', 'wb') as fp:
            s3_object.download_fileobj(fp)
        return f'./s3_downloads/{o}'    

    @tornado.web.authenticated
    def get(self):
        try:
            
            s3location = self.get_query_argument("s3location")
            temp_file = self._copy_s3_file(s3location)
            self.finish(json.dumps({
                "location": s3location,
                "temp_file": temp_file
            }))
        except Exception as e:
            self.finish(json.dumps({
                "exception": e
            }))



class RedirectingRouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            
            domain = os.environ.get('ONYX_DOMAIN', '*Unknown*').strip('/')
            token = os.environ.get('ONYX_TOKEN', '*Unknown*')
            route_extension = self.get_query_argument("route")
            route = f"{domain}/{route_extension}"
            r= requests.get(route, headers={"Authorization": f"Token {token}"})
            self.finish(r.content)
        except Exception as e:
            self.finish(json.dumps({
                "exception": e
            }))


class VersionHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        try:
            self.finish(json.dumps({
                "version": __version__,
            }))
        except Exception as e:
            self.finish(json.dumps({
                "exception": e
            }))


class FileWriteHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            path = self.get_query_argument("path")
            input_data = self.get_json_body()
            content = input_data["content"]
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            with open(path, 'w', encoding="utf-8") as fp:
                fp.write(content)
            self.finish(json.dumps({
                "path": path,
            }))
            
        except Exception as e:
            self.finish(json.dumps({
                "exception": e
            }))


def setup_handlers(web_app):
    tempfile.mkdtemp()
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]

    route_pattern = url_path_join(base_url, "climb-onyx-ui", "s3")
    handlers = [(route_pattern, S3ViewHandler)]
    web_app.add_handlers(host_pattern, handlers)

    
    route_pattern = url_path_join(base_url, "climb-onyx-ui", "reroute")
    handlers = [(route_pattern, RedirectingRouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    
    route_pattern = url_path_join(base_url, "climb-onyx-ui", "version")
    handlers = [(route_pattern, VersionHandler)]
    web_app.add_handlers(host_pattern, handlers)

    
    route_pattern = url_path_join(base_url, "climb-onyx-ui", "file-write")
    handlers = [(route_pattern, FileWriteHandler)]
    web_app.add_handlers(host_pattern, handlers)

