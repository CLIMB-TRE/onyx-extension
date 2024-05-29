import os
import json
import re
import tempfile
from pathlib import Path

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado


class RouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "domain": os.environ.get('ONYX_DOMAIN', '*Unknown*'),
            "token": os.environ.get('ONYX_TOKEN', '*Unknown*')
        }))

class S3ViewHandler(APIHandler):

    def _copy_s3_file(self, s3name:str)->str:
        m = re.match(r's3://(.*)/(.*)', s3name)
        b = m.group(1)
        o = m.group(2)
        Path("./tmp").mkdir(parents=True, exist_ok=True)
        with open(f'./tmp/{o}', 'w') as fp:
            fp.write(f'Contents of bucket {b}, object {o}, are here')
            fp.close()
        return f'./tmp/{o}'

    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    def get(self):
        s3location = self.get_query_argument("s3location")
        temp_file = self._copy_s3_file(s3location)
        self.finish(json.dumps({
            "location": s3location,
            "temp_file": temp_file
        }))

def setup_handlers(web_app):
    tempfile.mkdtemp()
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    # Prepend the base_url so that it works in a JupyterHub setting
    route_pattern = url_path_join(base_url, "onyx-extension", "settings")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    route_pattern = url_path_join(base_url, "onyx-extension", "s3")
    handlers = [(route_pattern, S3ViewHandler)]
    web_app.add_handlers(host_pattern, handlers)

