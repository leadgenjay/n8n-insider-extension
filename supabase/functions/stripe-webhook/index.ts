// Stripe Webhook Handler for n8n AI Copilot
// Handles payment events and updates user profiles

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.11.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('No signature provided', { status: 400 })
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log('Received event:', event.type)

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get user ID from client_reference_id (set during checkout)
        const userId = session.client_reference_id
        if (!userId) {
          console.error('No client_reference_id found in session')
          return new Response('No user ID in session', { status: 400 })
        }

        // Update user profile to Pro status
        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_lifetime: true,
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()

        if (error) {
          console.error('Error updating profile:', error)
          return new Response(`Database error: ${error.message}`, { status: 500 })
        }

        if (!data || data.length === 0) {
          console.error('User profile not found:', userId)
          return new Response('User not found', { status: 404 })
        }

        console.log('Successfully upgraded user to Pro:', userId)
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        // Handle subscription cancellation/updates (if you add subscriptions later)
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // For now, we only have lifetime purchases, but this is here for future use
        console.log('Subscription event for customer:', customerId)
        break
      }

      case 'charge.refunded': {
        // Handle refund - downgrade user
        const charge = event.data.object as Stripe.Charge
        const customerId = charge.customer as string

        if (!customerId) {
          console.error('No customer ID in charge')
          return new Response('No customer in charge', { status: 400 })
        }

        // Find user by stripe_customer_id and downgrade
        const { error } = await supabase
          .from('profiles')
          .update({
            is_lifetime: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('Error downgrading user:', error)
          return new Response(`Database error: ${error.message}`, { status: 500 })
        }

        console.log('User downgraded due to refund:', customerId)
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    // Return success response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
