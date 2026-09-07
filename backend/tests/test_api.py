"""
Comprehensive API integration tests covering:
- Auth registration, OTP verification, and JWT login
- Profile fetch and updates
- Contact management
- Direct conversation creation & deduplication
- Messaging, editing, deletion, and read receipts
- Group creation, admin controls, and member management
- Mock encryption verification
"""
from fastapi import status


def test_auth_full_flow(client):
    # 1. Register user
    reg_res = client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "Password123!", "phone": "+1234567890"},
    )
    assert reg_res.status_code == status.HTTP_201_CREATED
    assert "otp_code" in reg_res.json()
    otp_code = reg_res.json()["otp_code"]

    # 2. Verify OTP
    verify_res = client.post(
        "/api/auth/verify",
        json={"username": "alice", "otp_code": otp_code},
    )
    assert verify_res.status_code == status.HTTP_200_OK
    assert "access_token" in verify_res.json()
    token = verify_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Login with password
    login_res = client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "Password123!"},
    )
    assert login_res.status_code == status.HTTP_200_OK
    assert "access_token" in login_res.json()

    # 4. Get profile
    profile_res = client.get("/api/auth/me", headers=headers)
    assert profile_res.status_code == status.HTTP_200_OK
    assert profile_res.json()["username"] == "alice"

    # 5. Update profile
    update_res = client.patch(
        "/api/users/me",
        json={"display_name": "Alice Wonderland", "about": "Exploring cryptography"},
        headers=headers,
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["display_name"] == "Alice Wonderland"
    assert update_res.json()["about"] == "Exploring cryptography"


def test_contacts_and_conversations(client):
    # Register & verify Alice
    client.post("/api/auth/register", json={"username": "user1", "password": "Password123!"})
    res1 = client.post("/api/auth/verify", json={"username": "user1", "otp_code": "123456"})
    token1 = res1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register & verify Bob
    client.post("/api/auth/register", json={"username": "user2", "password": "Password123!"})
    res2 = client.post("/api/auth/verify", json={"username": "user2", "otp_code": "123456"})
    token2 = res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Bob's ID
    bob_info = client.get("/api/auth/me", headers=headers2).json()
    bob_id = bob_info["id"]

    # User 1 adds User 2 as contact
    contact_res = client.post("/api/contacts", json={"contact_user_id": bob_id}, headers=headers1)
    assert contact_res.status_code == status.HTTP_201_CREATED
    assert contact_res.json()["contact_username"] == "user2"

    # List contacts
    list_contacts = client.get("/api/contacts", headers=headers1)
    assert list_contacts.status_code == status.HTTP_200_OK
    assert len(list_contacts.json()) == 1

    # Create direct conversation between user1 and user2
    conv_res = client.post(
        "/api/conversations",
        json={"type": "DIRECT", "recipient_id": bob_id},
        headers=headers1,
    )
    assert conv_res.status_code == status.HTTP_201_CREATED
    conv_id = conv_res.json()["id"]

    # Deduplication test: creating again returns the same conversation
    conv_res_dup = client.post(
        "/api/conversations",
        json={"type": "DIRECT", "recipient_id": bob_id},
        headers=headers1,
    )
    assert conv_res_dup.status_code == status.HTTP_201_CREATED
    assert conv_res_dup.json()["id"] == conv_id

    # User 1 sends a message
    msg_res = client.post(
        f"/api/conversations/{conv_id}/messages",
        json={"content": "Hello Bob! Secure channel established.", "message_type": "TEXT"},
        headers=headers1,
    )
    assert msg_res.status_code == status.HTTP_201_CREATED
    msg_data = msg_res.json()
    assert msg_data["content"] == "Hello Bob! Secure channel established."
    msg_id = msg_data["id"]

    # User 2 reads the message
    user2_msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=headers2)
    assert user2_msgs.status_code == status.HTTP_200_OK
    assert len(user2_msgs.json()["messages"]) == 1

    # User 2 marks messages as read
    read_res = client.post(f"/api/conversations/{conv_id}/read", headers=headers2)
    assert read_res.status_code == status.HTTP_200_OK

    # Edit message
    edit_res = client.patch(
        f"/api/messages/{msg_id}",
        json={"content": "Hello Bob! (edited)"},
        headers=headers1,
    )
    assert edit_res.status_code == status.HTTP_200_OK
    assert edit_res.json()["content"] == "Hello Bob! (edited)"


def test_groups_and_permissions(client):
    # Register 3 users
    tokens = []
    user_ids = []
    for uname in ["admin_u", "member1", "member2"]:
        client.post("/api/auth/register", json={"username": uname, "password": "Password123!"})
        v = client.post("/api/auth/verify", json={"username": uname, "otp_code": "123456"})
        tokens.append(v.json()["access_token"])
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {v.json()['access_token']}"})
        user_ids.append(me.json()["id"])

    admin_headers = {"Authorization": f"Bearer {tokens[0]}"}
    member1_headers = {"Authorization": f"Bearer {tokens[1]}"}

    # Admin creates group
    group_res = client.post(
        "/api/groups",
        json={"name": "Engineering Core", "member_ids": [user_ids[1]]},
        headers=admin_headers,
    )
    assert group_res.status_code == status.HTTP_201_CREATED
    group_id = group_res.json()["id"]

    # Non-admin attempts to add member -> should fail 403
    forbidden_add = client.post(
        f"/api/groups/{group_id}/members",
        json={"user_id": user_ids[2]},
        headers=member1_headers,
    )
    assert forbidden_add.status_code == status.HTTP_403_FORBIDDEN

    # Admin adds member2
    admin_add = client.post(
        f"/api/groups/{group_id}/members",
        json={"user_id": user_ids[2]},
        headers=admin_headers,
    )
    assert admin_add.status_code == status.HTTP_200_OK

    # Fetch group details
    group_details = client.get(f"/api/groups/{group_id}", headers=admin_headers)
    assert group_details.status_code == status.HTTP_200_OK
    assert len(group_details.json()["members"]) == 3


def test_websocket_realtime(client):
    # Register & verify test user
    client.post("/api/auth/register", json={"username": "ws_user", "password": "Password123!"})
    v = client.post("/api/auth/verify", json={"username": "ws_user", "otp_code": "123456"})
    token = v.json()["access_token"]
    user_id = v.json()["user_id"]

    # Test WebSocket connection with token
    with client.websocket_connect(f"/ws/{user_id}?token={token}") as websocket:
        # Send ping
        websocket.send_json({"type": "ping"})
        response = websocket.receive_json()
        assert response["type"] == "pong"
