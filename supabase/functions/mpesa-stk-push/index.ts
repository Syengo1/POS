// supabase/functions/mpesa-stk-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight for React
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, amount } = await req.json()

    // 1. Load Environment Variables
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')!
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')!
    const passkey = Deno.env.get('DARAJA_PASSKEY')!
    const shortcode = Deno.env.get('DARAJA_SHORTCODE')!
    const environment = Deno.env.get('DARAJA_ENV') || 'sandbox' // 'sandbox' or 'production'
    const webhookUrl = Deno.env.get('MPESA_WEBHOOK_URL')! // Your Supabase webhook URL

    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    // 2. Format Phone Number (Ensure it starts with 254)
    let formattedPhone = phone.replace(/\D/g,'')
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1)
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1)

    // 3. Generate Daraja Access Token
    const auth = btoa(`${consumerKey}:${consumerSecret}`)
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    })
    const { access_token } = await tokenResponse.json()

    // 4. Generate STK Push Password & Timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    const password = btoa(`${shortcode}${passkey}${timestamp}`)

    // 5. Initiate STK Push
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", // Use "CustomerBuyGoodsOnline" for Buy Goods
      Amount: Math.ceil(amount), // Safaricom rejects decimals
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: webhookUrl,
      AccountReference: "POS System",
      TransactionDesc: "POS Payment"
    }

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    })
    
    const stkData = await stkResponse.json()

    if (stkData.errorCode) {
      throw new Error(stkData.errorMessage)
    }

    // 6. Save to Supabase (Using Service Role to bypass RLS securely)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('mpesa_transactions')
      .insert([{
        checkout_request_id: stkData.CheckoutRequestID,
        phone_number: formattedPhone,
        amount: amount,
        status: 'PENDING',
        timestamp: Date.now()
      }])

    if (dbError) throw dbError

    // 7. Return the CheckoutRequestID to React so it can subscribe to WebSockets
    return new Response(
      JSON.stringify({ success: true, checkout_request_id: stkData.CheckoutRequestID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})