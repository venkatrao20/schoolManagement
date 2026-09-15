import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def urlsafe(value):
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


private_key = ec.generate_private_key(ec.SECP256R1())
private_number = private_key.private_numbers().private_value.to_bytes(32, "big")
public_key = private_key.public_key().public_bytes(
    serialization.Encoding.X962,
    serialization.PublicFormat.UncompressedPoint
)

print("VAPID_PUBLIC_KEY=" + urlsafe(public_key))
print("VAPID_PRIVATE_KEY=" + urlsafe(private_number))
print("VAPID_SUBJECT=mailto:notifications@example.com")