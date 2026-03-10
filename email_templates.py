def get_base_styles():
    return """
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; margin: 0; padding: 0; color: #e4e4e7; }
        .container { max-width: 600px; margin: 40px auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5); }
        .header { background-color: #000000; padding: 24px; text-align: center; border-bottom: 1px solid #27272a; }
        .header h1 { margin: 0; color: #10b981; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 32px 24px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background-color: #064e3b; color: #6ee7b7; border: 1px solid #065f46; margin-bottom: 16px; }
        h2 { color: #ffffff; margin-top: 0; font-size: 22px; }
        p { color: #a1a1aa; line-height: 1.6; margin-bottom: 24px; }
        .info-box { background-color: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981; }
        .info-item { margin-bottom: 8px; }
        .info-label { color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
        .info-value { color: #ffffff; font-weight: 500; font-size: 14px; }
        .footer { background-color: #09090b; padding: 20px; text-align: center; font-size: 12px; color: #52525b; border-top: 1px solid #27272a; }
        .btn { display: inline-block; background-color: #10b981; color: #000000; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; transition: background 0.3s; }
        .btn:hover { background-color: #34d399; }
    </style>
    """

def get_user_ticket_received_html(ticket_id, title, category):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_base_styles()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CEIVoice Support</h1>
            </div>
            <div class="content">
                <span class="badge">Received</span>
                <h2>Request Received</h2>
                <p>Hello,</p>
                <p>We have successfully received your support request. Our AI system has categorized it and assigned it to the relevant specialist.</p>

                <div class="info-box">
                    <div class="info-item">
                        <span class="info-label">Ticket ID</span>
                        <div class="info-value">#{ticket_id}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Subject</span>
                        <div class="info-value">{title}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Category</span>
                        <div class="info-value">{category}</div>
                    </div>
                </div>

                <p>You will be notified via email when an agent responds to your request.</p>
            </div>
            <div class="footer">
                &copy; 2026 CEIVoice System. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

def get_staff_assignment_html(ticket_id, title, category, description):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>{get_base_styles()}</head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CEIVoice Admin</h1>
            </div>
            <div class="content">
                <span class="badge">New Assignment</span>
                <h2>New Ticket Assigned</h2>
                <p>The AI System has routed a new draft ticket to your queue based on the classification <strong>{category}</strong>.</p>

                <div class="info-box">
                    <div class="info-item">
                        <span class="info-label">Ticket ID</span>
                        <div class="info-value">#{ticket_id}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Title</span>
                        <div class="info-value">{title}</div>
                    </div>
                    <div class="info-item">
                        <span class="info-label">AI Description Summary</span>
                        <div class="info-value" style="white-space: pre-wrap;">{description[:150]}...</div>
                    </div>
                </div>

                <div style="text-align: center;">
                    <a href="http://localhost:3000/admin/drafts/{ticket_id}" class="btn">Review Draft</a>
                </div>
            </div>
            <div class="footer">
                This is an automated message from the CEIVoice AI Worker.
            </div>
        </div>
    </body>
    </html>
    """
