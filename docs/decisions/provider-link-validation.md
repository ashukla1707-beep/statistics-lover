# Provider link validation

Lecture delivery links are provider-specific. Google Meet is valid only for live join actions; Google Drive and Cloudflare Stream are valid only for watch actions. The database enforces this rule, and the admin client validates the same contract before persistence.
