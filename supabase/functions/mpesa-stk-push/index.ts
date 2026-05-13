// supabase/functions/mpesa-stk-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// GLOBAL IN-MEMORY CACHE
// This persists across back-to-back invocations while the function is "warm",
// cutting Daraja API execution time by 50% and preventing connection timeouts.
// ============================================================================
let cachedAccessToken: string | null = null;
let tokenExpiryTimestamp: number = 0;

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, amount } = await req.json()

    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')!
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')!
    const passkey = Deno.env.get('DARAJA_PASSKEY')!
    const shortcode = Deno.env.get('DARAJA_SHORTCODE')!
    const environment = Deno.env.get('DARAJA_ENV') || 'sandbox'
    const webhookUrl = Deno.env.get('MPESA_WEBHOOK_URL')! 

    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    // Format Phone Number strictly
    let formattedPhone = phone.replace(/\D/g, ''); 
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.length === 9) {
      formattedPhone = '254' + formattedPhone;
    }

    if (formattedPhone.length !== 12 || !formattedPhone.startsWith('254')) {
      throw new Error(`Invalid phone format: ${phone}`);
    }

    // ============================================================================
    // SMART TOKEN GENERATOR
    // Only ask Safaricom for a new token if we don't have one, or if it expired.
    // ============================================================================
    const currentTime = Date.now();
    if (!cachedAccessToken || currentTime >= tokenExpiryTimestamp) {
      console.log("Token expired or missing. Fetching new token from Daraja...");
      const auth = btoa(`${consumerKey}:${consumerSecret}`);
      const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      if (!tokenResponse.ok) throw new Error("Failed to generate Daraja token.");
      
      const tokenData = await tokenResponse.json();
      cachedAccessToken = tokenData.access_token;
      
      // Safaricom tokens live for 3599 seconds. We expire it safely at 3500 seconds (approx 58 mins)
      tokenExpiryTimestamp = currentTime + (3500 * 1000); 
    } else {
      console.log("Using cached Daraja token for lightning-fast execution.");
    }

    // Generate STK Push Password
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    const password = btoa(`${shortcode}${passkey}${timestamp}`)

    // Initiate STK Push
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline", 
      Amount: Math.ceil(amount), 
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: webhookUrl,
      AccountReference: "De' Lica", 
      TransactionDesc: "Liquor Store Payment" 
    }

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPayload)
    })
    
    const stkData = await stkResponse.json()

    if (stkData.errorCode) {
      throw new Error(stkData.errorMessage)
    }

    // Save to Supabase (Bypass RLS)
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

    // Return Success
    return new Response(
      JSON.stringify({ success: true, checkout_request_id: stkData.CheckoutRequestID }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})