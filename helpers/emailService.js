const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a verification email containing a 6-digit OTP.
 * @param {string} email - Recipient email address.
 * @param {string} otp - The 6-digit verification code.
 */
const sendVerificationEmail = async (email, otp) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: 'Verify Your Email - ConnectTeen',
            text: `Welcome to ConnectTeen! Your verification code is: ${otp}. This code will expire in 10 minutes.`,
            html: `
                <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">ConnectTeen</h1>
                    </div>
                    <div style="background-color: #f8fafc; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #0f172a; font-weight: 800; text-align: center; margin-top: 0;">Verify Your Email</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
                            Thank you for joining our community! To complete your registration, please use the following secure verification code:
                        </p>
                        <div style="background-color: #ffffff; padding: 30px; text-align: center; border-radius: 16px; border: 2px solid #e2e8f0; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #2563eb;">${otp}</span>
                        </div>
                        <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 0;">
                            This code will expire in <strong>10 minutes</strong>. <br>
                            If you didn't request this code, you can safely ignore this email.
                        </p>
                    </div>
                    <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} ConnectTeen Community. All rights reserved.
                        </p>
                        <p style="color: #cbd5e1; font-size: 11px; margin-top: 8px;">
                            You received this email because you registered on our platform.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_ERROR]', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL_SERVICE_ERROR]', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends a password reset email.
 */
const sendPasswordResetEmail = async (email, resetUrl) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            reply_to: fromEmail.match(/<(.+)>/)?.[1] || fromEmail,
            subject: 'Reset Password Request - ConnectTeen',
            text: `We received a request to reset your ConnectTeen password. Click here to reset: ${resetUrl}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @media only screen and (max-width: 600px) {
                            .container { padding: 20px 15px !important; }
                            .content { padding: 30px 20px !important; border-radius: 16px !important; }
                            .btn { padding: 16px 20px !important; width: 100% !important; box-sizing: border-box !important; font-size: 13px !important; }
                            h1 { font-size: 24px !important; }
                            h2 { font-size: 20px !important; }
                            p { font-size: 14px !important; }
                        }
                    </style>
                </head>
                <body style="margin: 0; padding: 0; background-color: #ffffff;">
                    <div class="container" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #1e293b;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">ConnectTeen</h1>
                        </div>
                        <div class="content" style="background-color: #f8fafc; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0;">
                            <h2 style="color: #0f172a; font-weight: 800; text-align: center; margin-top: 0;">Reset Your Password</h2>
                            <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
                                Kami menerima permintaan untuk mengatur ulang kata sandi akun administrator Anda. Klik tombol di bawah ini untuk melanjutkan:
                            </p>
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="${resetUrl}" class="btn" style="background-color: #0f172a; color: #ffffff; padding: 20px 40px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);">
                                    Atur Ulang Password
                                </a>
                            </div>
                            <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 0;">
                                Link ini berlaku selama <strong>60 menit</strong>. <br>
                                Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
                            </p>
                        </div>
                        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                &copy; ${new Date().getFullYear()} ConnectTeen Platform. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error('[RESEND_ERROR]', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL_SERVICE_ERROR]', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends an admin invitation email.
 */
const sendAdminInvitationEmail = async (email, role, joinUrl) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            reply_to: fromEmail.match(/<(.+)>/)?.[1] || fromEmail,
            subject: 'Invitation to Join ConnectTeen Admin',
            text: `You have been invited to join ConnectTeen as a ${role}. Accept here: ${joinUrl}`,
            html: `
                <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2563eb; margin: 0; font-size: 28px; font-weight: 800;">ConnectTeen</h1>
                    </div>
                    <div style="background-color: #f8fafc; border-radius: 24px; padding: 40px; border: 1px solid #e2e8f0;">
                        <h2 style="color: #0f172a; font-weight: 800; text-align: center; margin-top: 0;">Admin Invitation</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
                            Hello! You have been invited to join the <strong>ConnectTeen</strong> platform as a <strong>${role}</strong>.
                        </p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${joinUrl}" style="background-color: #2563eb; color: white; padding: 18px 36px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">
                                Accept Invitation
                            </a>
                        </div>
                        <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 0;">
                            This invitation link will expire in <strong>24 hours</strong>. <br>
                            If you weren't expecting this invitation, you can safely ignore this email.
                        </p>
                    </div>
                    <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                            &copy; ${new Date().getFullYear()} ConnectTeen Community. All rights reserved.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_INVITE_DEBUG_ERROR]', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL_SERVICE_ERROR]', err);
        return { success: false, error: err.message };
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendAdminInvitationEmail,
};
