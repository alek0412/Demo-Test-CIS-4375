# EC2 key (do not commit the key file)

Put your EC2 `.pem` key here (e.g. **HBC-Server-Key.pem**) so you can SSH from this project.

- The key file is ignored by git (`*.pem` in `.gitignore`).
- After adding the key, run: `chmod 400 HBC-Server-Key.pem` (Mac/Linux).
- SSH: `ssh -i keys/HBC-Server-Key.pem ec2-user@3.211.8.41`
