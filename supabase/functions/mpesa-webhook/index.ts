// supabase/functions/mpesa-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

serve(async (req) => {
  try {
    const data = await req.json()
    const callbackData = data.Body.stkCallback
    const checkoutRequestId = callbackData.CheckoutRequestID
    const resultCode = callbackData.ResultCode

    let status = 'FAILED'
    let receiptNumber = null

    // ResultCode 0 means the user successfully entered their PIN and paid
    if (resultCode === 0) {
      status = 'COMPLETED'
      // Safaricom buries the Receipt Number deep in an array of metadata items
      const metadata = callbackData.CallbackMetadata.Item
      const receiptItem = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')
      if (receiptItem) receiptNumber = receiptItem.Value
    }

    // Initialize Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update the transaction in the database
    // Because we enabled Realtime on this table, this update will INSTANTLY 
    // push to your React frontend!
    await supabaseAdmin
      .from('mpesa_transactions')
      .update({ 
        status: status, 
        mpesa_receipt_number: receiptNumber 
      })
      .eq('checkout_request_id', checkoutRequestId)

    // ALWAYS return a standard successful response to Safaricom, 
    // even if the payment failed (e.g., user canceled), so they don't retry.
    return new Response(
      JSON.stringify({ "ResultCode": 0, "ResultDesc": "Success" }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    // If our code breaks, log it but still tell Safaricom we received it
    console.error("Webhook Error:", error.message)
    return new Response(
      JSON.stringify({ "ResultCode": 0, "ResultDesc": "Success" }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})