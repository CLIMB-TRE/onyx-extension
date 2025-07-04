class APIError(Exception):
    STATUS_CODE = 500


class ValidationError(APIError):
    STATUS_CODE = 400


class AuthenticationError(APIError):
    STATUS_CODE = 401


class PermissionError(APIError):
    STATUS_CODE = 403


class NotFoundError(APIError):
    STATUS_CODE = 404


class BadGatewayError(APIError):
    STATUS_CODE = 502


class GatewayTimeoutError(APIError):
    STATUS_CODE = 504
