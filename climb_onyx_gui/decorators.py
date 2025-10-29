import json
import functools
from .exceptions import APIError


def handle_api_errors(func):
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        try:
            return func(self, *args, **kwargs)
        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))

    return wrapper


def async_handle_api_errors(func):
    @functools.wraps(func)
    async def wrapper(self, *args, **kwargs):
        try:
            return await func(self, *args, **kwargs)
        except APIError as e:
            self.set_status(e.STATUS_CODE)
            self.finish(json.dumps({"message": str(e)}))

    return wrapper
