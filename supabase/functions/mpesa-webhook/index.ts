// supabase/functions/mpesa-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

serve(async (req) => {
  try {
    // 1. Parse incoming payload
    const data = await req.json()
    
    // 2. Log the raw payload to the Supabase Dashboard for easy debugging
    console.log("Safaricom Webhook Payload:", JSON.stringify(data, null, 2))

    // 3. Safely extract data using Optional Chaining to prevent TypeError crashes
    const callbackData = data?.Body?.stkCallback
    
    if (!callbackData) {
      console.error("Invalid payload structure received.")
      // Daraja demands a 200 OK regardless of structure, or it will retry endlessly
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const checkoutRequestId = callbackData.CheckoutRequestID
    const resultCode = callbackData.ResultCode

    let status = 'FAILED'
    let receiptNumber = null

    // 4. ResultCode 0 = Success
    if (resultCode === 0) {
      status = 'COMPLETED'
      
      // Safely map through Safaricom's nested metadata array
      const metadata = callbackData.CallbackMetadata?.Item || []
      const receiptItem = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')
      
      if (receiptItem) {
        receiptNumber = receiptItem.Value
      }
    } else {
      // Log the specific failure reason provided by Safaricom (e.g., "Request cancelled by user")
      console.log(`Transaction Failed. Reason: ${callbackData.ResultDesc}`)
    }

    // 5. Initialize Supabase Admin with Service Role Key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 6. Execute the Database Update
    const { error: dbError } = await supabaseAdmin
      .from('mpesa_transactions')
      .update({ 
        status: status, 
        mpesa_receipt_number: receiptNumber 
      })
      .eq('checkout_request_id', checkoutRequestId)

    if (dbError) {
      console.error("Database Update Error:", dbError.message)
    } else {
      console.log(`Successfully updated DB row ${checkoutRequestId} to ${status}`)
    }

    // 7. Acknowledge Receipt to Safaricom
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Fatal Webhook Execution Error:", error.message)
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Success" }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})