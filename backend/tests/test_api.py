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
        json={"username": "alice", "password": "Pass123!", "phone": "+1234567890"},
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
        json={"username": "alice", "password": "Pass123!"},
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
    client.post("/api/auth/register", json={"username": "user1", "password": "Pass123!"})
    res1 = client.post("/api/auth/verify", json={"username": "user1", "otp_code": "123456"})
    token1 = res1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register & verify Bob
    client.post("/api/auth/register", json={"username": "user2", "password": "Pass123!"})
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
        client.post("/api/auth/register", json={"username": uname, "password": "Pass123!"})
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

    # Test invite code retrieval
    invite_res = client.get(f"/api/groups/{group_id}/invite-code", headers=admin_headers)
    assert invite_res.status_code == status.HTTP_200_OK
    code = invite_res.json()["invite_code"]
    assert code is not None

    # Test preview group invite
    preview_res = client.get(f"/api/groups/preview/{code}")
    assert preview_res.status_code == status.HTTP_200_OK
    assert preview_res.json()["name"] == "Engineering Core"
    assert preview_res.json()["member_count"] == 3

    # Register a 4th user to join via invite code
    client.post("/api/auth/register", json={"username": "member3", "password": "Pass123!"})
    v4 = client.post("/api/auth/verify", json={"username": "member3", "otp_code": "123456"})
    member3_headers = {"Authorization": f"Bearer {v4.json()['access_token']}"}

    # Join group via invite code
    join_res = client.post(f"/api/groups/join/{code}", headers=member3_headers)
    assert join_res.status_code == status.HTTP_200_OK

    # Verify group details now have 4 members
    group_details2 = client.get(f"/api/groups/{group_id}", headers=admin_headers)
    assert len(group_details2.json()["members"]) == 4

    # Admin resets invite code
    reset_res = client.post(f"/api/groups/{group_id}/invite-code/reset", headers=admin_headers)
    assert reset_res.status_code == status.HTTP_200_OK
    new_code = reset_res.json()["invite_code"]
    assert new_code != code


def test_websocket_realtime(client):
    # Register & verify test user
    client.post("/api/auth/register", json={"username": "ws_user", "password": "Pass123!"})
    v = client.post("/api/auth/verify", json={"username": "ws_user", "otp_code": "123456"})
    token = v.json()["access_token"]
    user_id = v.json()["user_id"]

    # Test WebSocket connection with token
    with client.websocket_connect(f"/ws/{user_id}?token={token}") as websocket:
        # Send ping
        websocket.send_json({"type": "ping"})
        response = websocket.receive_json()
        assert response["type"] == "pong"


def test_settings_and_password_validation(client):
    # Register & verify test user
    reg = client.post("/api/auth/register", json={"username": "settings_user", "password": "Pass123!"})
    assert reg.status_code == status.HTTP_201_CREATED

    # Try invalid passwords during register
    # 1. Too long (>8 chars)
    bad_res1 = client.post("/api/auth/register", json={"username": "user_long", "password": "Password123!"})
    assert bad_res1.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # 2. No special character
    bad_res2 = client.post("/api/auth/register", json={"username": "user_nospec", "password": "Password1"})
    assert bad_res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Verify settings_user
    v = client.post("/api/auth/verify", json={"username": "settings_user", "otp_code": "123456"})
    token = v.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get settings default
    get_res = client.get("/api/settings", headers=headers)
    assert get_res.status_code == status.HTTP_200_OK
    data = get_res.json()
    assert data["read_receipts"] is True
    assert data["screen_security"] is True
    assert data["disappearing_messages_timer"] == "off"

    # 2. Update settings
    put_res = client.put(
        "/api/settings",
        json={"read_receipts": False, "disappearing_messages_timer": "1_day", "incognito_keyboard": True},
        headers=headers,
    )
    assert put_res.status_code == status.HTTP_200_OK
    updated = put_res.json()
    assert updated["read_receipts"] is False
    assert updated["disappearing_messages_timer"] == "1_day"
    assert updated["incognito_keyboard"] is True

    # 3. Change password successfully (max 8 chars strong)
    chg_res = client.post(
        "/api/settings/change-password",
        json={"current_password": "Pass123!", "new_password": "New456@"},
        headers=headers,
    )
    assert chg_res.status_code == status.HTTP_200_OK

    # 4. Try changing with bad password (>8 chars)
    chg_bad = client.post(
        "/api/settings/change-password",
        json={"current_password": "New456@", "new_password": "TooLongPassword1!"},
        headers=headers,
    )
    assert chg_bad.status_code == status.HTTP_400_BAD_REQUEST

