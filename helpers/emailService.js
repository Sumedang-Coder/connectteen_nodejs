const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a verification email containing a 6-digit OTP.
 * @param {string} email - Recipient email address.
 * @param {string} otp - The 6-digit verification code.
 */
const sendVerificationEmail = async (email, otp) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>',
            to: [email],
            subject: 'Verify Your Email - ConnectTeen',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                    <h2 style="color: #1e293b; font-weight: 800; text-align: center;">Welcome to ConnectTeen!</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Thank you for registering. Please use the following 6-digit code to verify your email address:
                    </p>
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #2563eb;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        This code will expire in 10 minutes. If you didn't request this, please ignore this email.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        &copy; ${new Date().getFullYear()} ConnectTeen. All rights reserved.
                    </p>
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

const sendPasswordResetEmail = async (email, resetUrl) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>',
            to: [email],
            subject: 'Reset Password Request - ConnectTeen',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #fcfcfc; border: 1px solid #f1f5f9; border-radius: 24px;">
                    <h2 style="color: #0f172a; font-weight: 900; text-align: center; font-size: 24px; margin-bottom: 10px; letter-spacing: -0.025em;">Reset Password</h2>
                    <p style="color: #64748b; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                        Kami menerima permintaan untuk mengatur ulang kata sandi akun administrator ConnectTeen Anda. Silakan klik tombol di bawah ini:
                    </p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${resetUrl}" style="background-color: #0f172a; color: #ffffff; padding: 18px 36px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                            Atur Ulang Password
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 13px; text-align: center; line-height: 1.5;">
                        Link ini berlaku selama 60 menit.<br>
                        Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 40px 0;" />
                    <p style="color: #cbd5e1; font-size: 11px; text-align: center; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em;">
                        &copy; ${new Date().getFullYear()} ConnectTeen Platform. All rights reserved.
                    </p>
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

const sendAdminInvitationEmail = async (email, role, joinUrl) => {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'ConnectTeen <onboarding@resend.dev>',
            to: [email],
            subject: 'Invitation to Join ConnectTeen Admin',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #1e293b; font-weight: 800; text-align: center;">You're Invited!</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        You have been invited to join the ConnectTeen platform as a <strong>${role}</strong>.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${joinUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Accept Invitation & Set Password
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                        This invitation link will expire in 24 hours. If you weren't expecting this invitation, you can safely ignore this email.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                        &copy; ${new Date().getFullYear()} ConnectTeen. All rights reserved.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_INVITE_DEBUG_ERROR]', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('[RESEND_INVITE_DEBUG_SUCCESS]', JSON.stringify(data, null, 2));
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
