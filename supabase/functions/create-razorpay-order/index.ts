import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const RAZORPAY_KEY_ID = Deno.env.get(
  "RAZORPAY_KEY_ID"
);

const RAZORPAY_KEY_SECRET = Deno.env.get(
  "RAZORPAY_KEY_SECRET"
);

const REGISTRATION_AMOUNT = 79900; // ₹799 in paise
const REGISTRATION_CURRENCY = "INR";

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      try {
        // ==========================================
        // METHOD CHECK
        // ==========================================

        if (req.method !== "POST") {
          return Response.json(
            {
              success: false,
              error: "Method not allowed.",
            },
            { status: 405 }
          );
        }

        // ==========================================
        // RAZORPAY CONFIG CHECK
        // ==========================================

        if (
          !RAZORPAY_KEY_ID ||
          !RAZORPAY_KEY_SECRET
        ) {
          console.error(
            "Razorpay secrets are missing."
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment service is not configured.",
            },
            { status: 500 }
          );
        }

        // ==========================================
        // AUTHENTICATED USER
        // ==========================================

        const userId = ctx.userClaims?.sub;
        const userEmail =
          ctx.userClaims?.email || "";

        if (!userId) {
          return Response.json(
            {
              success: false,
              error:
                "Please login before making payment.",
            },
            { status: 401 }
          );
        }

        // ==========================================
        // CHECK CURRENT PAYMENT STATUS
        // ==========================================

        const {
          data: profile,
          error: profileError,
        } = await ctx.supabase
          .from("profiles")
          .select("registration_paid")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Profile payment status check failed:",
            profileError
          );

          return Response.json(
            {
              success: false,
              error:
                "Unable to check your registration status.",
            },
            { status: 500 }
          );
        }

        if (
          profile?.registration_paid === true
        ) {
          return Response.json({
            success: true,
            already_paid: true,
            message:
              "Your registration payment is already completed.",
          });
        }

        // ==========================================
        // READ REQUEST BODY
        // ==========================================

        let body: {
          receipt?: unknown;
        } = {};

        try {
          body = await req.json();
        } catch {
          body = {};
        }

        // ==========================================
        // NEVER TRUST FRONTEND AMOUNT
        // ==========================================

        const amount =
          REGISTRATION_AMOUNT;

        // ==========================================
        // CREATE UNIQUE RECEIPT
        // ==========================================

        let receipt =
          `TM_REG_${userId.slice(
            0,
            8
          )}_${Date.now()}`;

        if (
          typeof body.receipt ===
            "string" &&
          body.receipt.trim()
        ) {
          receipt = body.receipt
            .trim()
            .slice(0, 40);
        }

        // ==========================================
        // RAZORPAY BASIC AUTH
        // ==========================================

        const auth = btoa(
          `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
        );

        // ==========================================
        // CREATE RAZORPAY ORDER
        // ==========================================

        const razorpayResponse =
          await fetch(
            "https://api.razorpay.com/v1/orders",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Basic ${auth}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                amount,
                currency:
                  REGISTRATION_CURRENCY,
                receipt,

                notes: {
                  user_id: userId,
                  email: userEmail,
                  payment_type:
                    "registration",
                  product:
                    "TripMitra Registration",
                },
              }),
            }
          );

        let razorpayData = null;

        try {
          razorpayData =
            await razorpayResponse.json();
        } catch {
          razorpayData = null;
        }

        // ==========================================
        // RAZORPAY ERROR
        // ==========================================

        if (!razorpayResponse.ok) {
          console.error(
            "Razorpay order creation failed:",
            razorpayData
          );

          return Response.json(
            {
              success: false,
              error:
                razorpayData?.error
                  ?.description ||
                "Unable to create Razorpay order.",
            },
            {
              status:
                razorpayResponse.status ||
                500,
            }
          );
        }

        // ==========================================
        // VALIDATE RAZORPAY RESPONSE
        // ==========================================

        if (
          !razorpayData?.id ||
          !razorpayData?.amount
        ) {
          console.error(
            "Invalid Razorpay order response:",
            razorpayData
          );

          return Response.json(
            {
              success: false,
              error:
                "Invalid response received from Razorpay.",
            },
            { status: 502 }
          );
        }

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        return Response.json({
          success: true,

          order_id:
            razorpayData.id,

          amount:
            razorpayData.amount,

          currency:
            razorpayData.currency ||
            REGISTRATION_CURRENCY,

          key_id:
            RAZORPAY_KEY_ID,

          receipt:
            razorpayData.receipt,

          message:
            "Razorpay order created successfully.",
        });
      } catch (error) {
        console.error(
          "Create Razorpay order error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              "Unable to create payment order.",
          },
          { status: 500 }
        );
      }
    }
  ),
};