# Lockerroom

> This is a API for a Messaging platform

### List of endpoints

Here is an example of the endpoints you could implement.

| Endpoint                       | Method | Bearer token? | Admin only | Request                                             | Response                                                                                                 |
| ------------------------------ | ------ | ------------- | ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| /auth/register                 | POST   |               |            | An object containing a login, and a password        | A message stating the user has been created (or the approriate error, if any)                            |
| /auth/login                    | POST   |               |            | An object containing a login, and a password        | A JSON Web Token/session ID (or the approriate error, if any)                                            |
| /lobby                         | POST   | yes           |            | An object containing a Teamname                     | A message stating Lobby created succesfully                                                              |
| /lobby/[lobby-id]              | GET    | yes           |            | -                                                   | An array containing all the message from the lobby                                                       |
| /lobby/[lobby-id]/[message-id] | GET    | yes           |            | -                                                   | A single message object from the lobby                                                                   |
| /lobby/[lobby-id]              | POST   | yes           |            | An object containing the message                    | A message stating the message has been posted (or the approriate error, if any)                          |
| /lobby/[lobby-id]/add-user     | POST   | yes           | yes        | The user to add to the lobby                        | Add an user to a lobby                                                                                   |
| /lobby/[lobby-id]/remove-user  | POST   | yes           | yes        | The user to remove from the lobby                   | Removes an user from the lobby                                                                           |
| /lobby/[lobby-id]/add-new      | POST   | yes           | yes        | Admin can add non-registered person to a lobby      | Adds a person to lobby that has no account yet                                                           |
| /users                         | GET    | yes           | (yes)\*    | -                                                   | All the users from the same lobby                                                                        |
| /users/[user-id]               | GET    | yes           |            | -                                                   | A single user. If the user is not an admin, can only get details from people that are in the same lobby. |
| /message/[message-id]          | PATCH  | yes           | (yes)\*\*  | An object containing the message patches            | Edit a message. Users can only edit their own messages, unless they are admins.                          |
| /message/[message-id]          | DELETE | yes           | (yes)\*\*  | -                                                   | Delete a message. Users can only edit their own messages, unless they are admins.                        |
| /message/private-message       | GET    | yes           |            | -                                                   | Shows all private messages u send and recieved                                                           |
| /message/private-message       | POST   | yes           |            | An object containing ur message and the reciever ID | Sends a private message , recieve a msg saying pm send                                                   |
| /page/[lobby-id]               | GET    | yes           |            | A Limit and Offset value's                          | This returns a list of messages that considers the LIMIT and OFFSET                                      |
