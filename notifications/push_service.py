import json
import os


def push_is_configured():
    return bool(
        os.environ.get("VAPID_PUBLIC_KEY")
        and os.environ.get("VAPID_PRIVATE_KEY")
        and os.environ.get("VAPID_SUBJECT")
    )


def send_push(subscription, title, message, notification_type, url="/"):
    if not push_is_configured():
        return "not_configured"

    public_base_url = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
    if public_base_url and url.startswith("/"):
        url = public_base_url + url

    try:
        from pywebpush import WebPushException, webpush

        webpush(
            subscription_info=subscription,
            data=json.dumps({
                "title": title,
                "message": message,
                "type": notification_type,
                "url": url
            }),
            vapid_private_key=os.environ["VAPID_PRIVATE_KEY"],
            vapid_claims={"sub": os.environ["VAPID_SUBJECT"]}
        )
        return "sent"
    except ImportError:
        return "not_configured"
    except WebPushException as error:
        status_code = getattr(getattr(error, "response", None), "status_code", None)
        if status_code in {404, 410}:
            return "expired"
        return "failed"
    except Exception:
        return "failed"