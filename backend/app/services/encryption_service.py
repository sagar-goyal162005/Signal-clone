"""
Mock encryption service — simulates end-to-end encryption using Base64 encoding.

IMPORTANT: This is NOT Signal Protocol or real end-to-end encryption.
This is a development simulation that can be swapped for actual cryptographic
implementations in production. The architecture keeps encryption isolated
behind this service interface.
"""
import base64


def encrypt_message(plaintext: str) -> str:
    """Simulate message encryption using Base64 encoding."""
    return base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_message(ciphertext: str) -> str:
    """Simulate message decryption using Base64 decoding."""
    try:
        return base64.b64decode(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception:
        # If decryption fails, return the original text
        return ciphertext


def generate_safety_number(user_id_a: int, user_id_b: int) -> str:
    """Generate a mock safety number for identity verification between two users."""
    combined = f"{min(user_id_a, user_id_b)}:{max(user_id_a, user_id_b)}"
    hash_val = hash(combined) & 0xFFFFFFFFFFFFFFFF
    digits = str(hash_val).ljust(60, "0")[:60]
    # Format as 12 groups of 5 digits
    return " ".join([digits[i:i+5] for i in range(0, 60, 5)])
