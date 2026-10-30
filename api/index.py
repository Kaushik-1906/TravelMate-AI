import json


async def app(scope, receive, send):
    """Temporary routing probe: reports what path the Python function receives."""
    if scope["type"] != "http":
        return

    payload = json.dumps(
        {
            "probe": "ok",
            "path": scope.get("path"),
            "root_path": scope.get("root_path"),
            "query": scope.get("query_string", b"").decode(),
        }
    ).encode()

    await send(
        {
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        }
    )
    await send({"type": "http.response.body", "body": payload})
