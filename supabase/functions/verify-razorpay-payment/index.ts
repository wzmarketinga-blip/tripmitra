import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const RAZORPAY_KEY_ID = Deno.env.get(
  "RAZORPAY_KEY_ID"
);

const RAZORPAY_KEY_SECRET = Deno.env.get(
  "RAZORPAY_KEY_SECRET"
);

const REGISTRATION_AMOUNT = 79900;
const REGISTRATION_CURRENCY = "INR";

// ==========================================
// VERIFY RAZORPAY SIGNATURE
// ==========================================

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
) {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const data =
    `${orderId}|${paymentId}`;

  const signatureBuffer =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(data)
    );

  const generatedSignature =
    Array.from(
      new Uint8Array(
        signatureBuffer
      )
    )
      .map((byte) =>
        byte
          .toString(16)
          .padStart(2, "0")
      )
      .join("");

  // Constant-time style comparison
  if (
    generatedSignature.length !==
    signature.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index <
    generatedSignature.length;
    index++
  ) {
    difference |=
      generatedSignature.charCodeAt(
        index
      ) ^
      signature.charCodeAt(
        index
      );
  }

  return difference === 0;
}

// ==========================================
// RAZORPAY API REQUEST
// ==========================================

async function razorpayRequest(
  url: string,
  keyId: string,
  secret: string
) {
  const credentials =
    `${keyId}:${secret}`;

  const authorization =
    `Basic ${btoa(credentials)}`;

  const response =
    await fetch(url, {
      method: "GET",

      headers: {
        Authorization:
          authorization,

        "Content-Type":
          "application/json",
      },
    });

  let data: any = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error
        ?.description ||
        data?.error?.code ||
        "Razorpay API request failed."
    );
  }

  return data;
}

// ==========================================
// EDGE FUNCTION
// ==========================================

export default {
  fetch: withSupabase(
    {
      // Browser sends logged-in user's
      // Supabase JWT in Authorization header.
      auth: "user",
    },

    async (req, ctx) => {
      try {
        // ========================================
        // METHOD
        // ========================================

        if (
          req.method !== "POST"
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Method not allowed.",
            },
            {
              status: 405,
            }
          );
        }

        // ========================================
        // ENVIRONMENT
        // ========================================

        if (
          !RAZORPAY_KEY_ID ||
          !RAZORPAY_KEY_SECRET
        ) {
          console.error(
            "Razorpay environment variables are missing."
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment service is not configured.",
            },
            {
              status: 500,
            }
          );
        }

        // ========================================
        // AUTHENTICATED USER
        // ========================================

        const userId =
          ctx.userClaims?.id;

        if (!userId) {
          return Response.json(
            {
              success: false,
              error:
                "Please login before verifying payment.",
            },
            {
              status: 401,
            }
          );
        }

        // ========================================
        // REQUEST BODY
        // ========================================

        let body: Record<
          string,
          unknown
        >;

        try {
          body =
            await req.json();
        } catch {
          return Response.json(
            {
              success: false,
              error:
                "Invalid request body.",
            },
            {
              status: 400,
            }
          );
        }

        const razorpayOrderId =
          body?.razorpay_order_id;

        const razorpayPaymentId =
          body?.razorpay_payment_id;

        const razorpaySignature =
          body?.razorpay_signature;

        if (
          typeof razorpayOrderId !==
            "string" ||
          typeof razorpayPaymentId !==
            "string" ||
          typeof razorpaySignature !==
            "string"
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Incomplete Razorpay payment details.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 1
        // VERIFY SIGNATURE
        // ========================================

        const signatureValid =
          await verifySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            RAZORPAY_KEY_SECRET
          );

        if (!signatureValid) {
          console.error(
            "Invalid Razorpay signature.",
            {
              userId,
              orderId:
                razorpayOrderId,
              paymentId:
                razorpayPaymentId,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment verification failed.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 2
        // FETCH RAZORPAY ORDER
        // ========================================

        const orderData =
          await razorpayRequest(
            `https://api.razorpay.com/v1/orders/${encodeURIComponent(
              razorpayOrderId
            )}`,
            RAZORPAY_KEY_ID,
            RAZORPAY_KEY_SECRET
          );

        if (
          !orderData?.id
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Razorpay order could not be found.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 3
        // VERIFY ORDER AMOUNT
        // ========================================

        if (
          Number(
            orderData.amount
          ) !==
          REGISTRATION_AMOUNT
        ) {
          console.error(
            "Invalid registration amount.",
            {
              expected:
                REGISTRATION_AMOUNT,
              received:
                orderData.amount,
              orderId:
                razorpayOrderId,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Invalid registration payment amount.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 4
        // VERIFY ORDER CURRENCY
        // ========================================

        if (
          String(
            orderData.currency ||
              ""
          ).toUpperCase() !==
          REGISTRATION_CURRENCY
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Invalid payment currency.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 5
        // VERIFY ORDER NOTES
        // ========================================

        const orderNotes =
          orderData.notes || {};

        // Our own order-creation function
        // stores these values.
        if (
          orderNotes.payment_type !==
          "registration"
        ) {
          console.error(
            "Invalid payment type in Razorpay order.",
            {
              orderId:
                razorpayOrderId,
              paymentType:
                orderNotes.payment_type,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "This Razorpay order is not a registration payment.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 6
        // VERIFY ORDER OWNER
        // ========================================

        if (
          orderNotes.user_id !==
          userId
        ) {
          console.error(
            "Order ownership mismatch.",
            {
              orderUser:
                orderNotes.user_id,
              authenticatedUser:
                userId,
              orderId:
                razorpayOrderId,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "This payment order does not belong to the current account.",
            },
            {
              status: 403,
            }
          );
        }

        // ========================================
        // STEP 7
        // FETCH PAYMENT
        // ========================================

        const paymentData =
          await razorpayRequest(
            `https://api.razorpay.com/v1/payments/${encodeURIComponent(
              razorpayPaymentId
            )}`,
            RAZORPAY_KEY_ID,
            RAZORPAY_KEY_SECRET
          );

        if (
          !paymentData?.id
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Razorpay payment could not be found.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 8
        // PAYMENT MUST BELONG TO ORDER
        // ========================================

        if (
          paymentData.order_id !==
          razorpayOrderId
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Payment does not belong to this order.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 9
        // VERIFY PAYMENT AMOUNT
        // ========================================

        if (
          Number(
            paymentData.amount
          ) !==
          REGISTRATION_AMOUNT
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Payment amount does not match the registration fee.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 10
        // VERIFY PAYMENT CURRENCY
        // ========================================

        if (
          String(
            paymentData.currency ||
              ""
          ).toUpperCase() !==
          REGISTRATION_CURRENCY
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Payment currency is invalid.",
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 11
        // VERIFY CAPTURED STATUS
        // ========================================

        const paymentStatus =
          String(
            paymentData.status ||
              ""
          ).toLowerCase();

        const captured =
          paymentData.captured ===
          true;

        if (
          paymentStatus !==
            "captured" ||
          !captured
        ) {
          return Response.json(
            {
              success: false,
              error:
                "Payment has not been captured yet.",
              payment_status:
                paymentData.status ||
                null,
            },
            {
              status: 400,
            }
          );
        }

        // ========================================
        // STEP 12
        // USE ADMIN CLIENT FOR PROTECTED WRITES
        // ========================================
        //
        // ctx.supabase:
        //   user-scoped RLS client
        //
        // ctx.supabaseAdmin:
        //   trusted server-side client
        //   bypasses RLS
        //
        // We use the admin client ONLY after
        // Razorpay verification succeeds.
        //

        const supabaseAdmin =
          ctx.supabaseAdmin;

        // ========================================
        // STEP 13
        // CHECK PROFILE
        // ========================================

        const {
          data: existingProfile,
          error:
            existingProfileError,
        } =
          await supabaseAdmin
            .from("profiles")
            .select(
              "registration_paid"
            )
            .eq(
              "id",
              userId
            )
            .maybeSingle();

        if (
          existingProfileError
        ) {
          console.error(
            "Profile lookup error:",
            existingProfileError
          );

          return Response.json(
            {
              success: false,
              error:
                "Unable to check account payment status.",
            },
            {
              status: 500,
            }
          );
        }

        // ========================================
        // ALREADY ACTIVATED
        // ========================================

        if (
          existingProfile
            ?.registration_paid ===
          true
        ) {
          return Response.json({
            success: true,
            already_processed:
              true,
            payment_id:
              razorpayPaymentId,
            order_id:
              razorpayOrderId,
            message:
              "Payment was already verified and the account is active.",
          });
        }

        // ========================================
        // STEP 14
        // CHECK EXISTING SUCCESSFUL REGISTRATION
        // ========================================

        const {
          data: existingPayment,
          error:
            existingPaymentError,
        } =
          await supabaseAdmin
            .from("payments")
            .select("id")
            .eq(
              "user_id",
              userId
            )
            .eq(
              "payment_type",
              "registration"
            )
            .eq(
              "status",
              "success"
            )
            .limit(1)
            .maybeSingle();

        if (
          existingPaymentError
        ) {
          console.error(
            "Existing payment lookup error:",
            existingPaymentError
          );

          return Response.json(
            {
              success: false,
              error:
                "Unable to check previous payment records.",
            },
            {
              status: 500,
            }
          );
        }

        // ========================================
        // IF SUCCESSFUL PAYMENT RECORD ALREADY EXISTS
        // ACTIVATE ACCOUNT WITHOUT DUPLICATE ROW
        // ========================================

        if (
          existingPayment
        ) {
          const {
            error:
              existingActivationError,
          } =
            await supabaseAdmin
              .from(
                "profiles"
              )
              .update({
                registration_paid:
                  true,
              })
              .eq(
                "id",
                userId
              );

          if (
            existingActivationError
          ) {
            console.error(
              "Existing-payment profile activation error:",
              existingActivationError
            );

            return Response.json(
              {
                success: false,
                error:
                  "Previous payment found but account activation failed.",
              },
              {
                status: 500,
              }
            );
          }

          return Response.json({
            success: true,
            already_processed:
              true,
            payment_id:
              razorpayPaymentId,
            order_id:
              razorpayOrderId,
            message:
              "Registration payment is already recorded and the account is active.",
          });
        }

        // ========================================
        // STEP 15
        // INSERT PAYMENT RECORD
        // ========================================

        const {
          error: paymentError,
        } =
          await supabaseAdmin
            .from("payments")
            .insert({
              user_id:
                userId,

              amount:
                799,

              payment_type:
                "registration",

              status:
                "success",
            });

        if (
          paymentError
        ) {
          console.error(
            "Payment database error:",
            paymentError
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment verified but transaction record could not be saved.",
            },
            {
              status: 500,
            }
          );
        }

        // ========================================
        // STEP 16
        // ACTIVATE ACCOUNT
        // ========================================

        const {
          error:
            profileError,
        } =
          await supabaseAdmin
            .from("profiles")
            .update({
              registration_paid:
                true,
            })
            .eq(
              "id",
              userId
            );

        if (
          profileError
        ) {
          console.error(
            "Profile activation error:",
            profileError
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment verified but account activation failed.",
            },
            {
              status: 500
            }
          );
        }

        // ========================================
        // SUCCESS
        // ========================================

        console.log(
          "Razorpay payment verified successfully.",
          {
            userId,
            orderId:
              razorpayOrderId,
            paymentId:
              razorpayPaymentId,
          }
        );

        return Response.json({
          success: true,

          payment_id:
            razorpayPaymentId,

          order_id:
            razorpayOrderId,

          message:
            "Payment verified successfully.",
        });
      } catch (error) {
        console.error(
          "Verify Razorpay payment error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              error?.message ||
              "Unable to verify payment.",
          },
          {
            status: 500,
          }
        );
      }
    }
  ),
};