from fastapi import HTTPException, status


class TravelMateException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class ResourceNotFoundException(TravelMateException):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id '{resource_id}' was not found."
        )


class UnauthorizedAccessException(TravelMateException):
    def __init__(self, detail: str = "Authentication required or credentials invalid."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail
        )


class ForbiddenOperationException(TravelMateException):
    def __init__(self, detail: str = "You do not have permission to access or modify this resource."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class AIGenerationException(TravelMateException):
    def __init__(self, detail: str = "AI Itinerary generation failed."):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail
        )
