Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Custom health check endpoints
  get "health", to: "health#index"
  get "health/detailed", to: "health#detailed"
  get "health/ready", to: "health#ready"
  get "health/live", to: "health#live"

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  root "calls#index"

  # Call management routes
  resources :calls, only: [:index, :show] do
    member do
      get :recording
      post :cancel
    end
  end

  # Upload routes for CSV phone numbers
  get "upload", to: "upload#new"
  post "upload", to: "upload#create"

  # AI prompt route
  post "prompt", to: "prompt#create"

  # Bulk operations
  get "bulk_operations", to: "bulk_operations#new"
  post "bulk_operations", to: "bulk_operations#create"

  # Reports and analytics
  get "reports", to: "reports#index"
  get "reports/export", to: "reports#export"
  get "reports/cost_analysis", to: "reports#cost_analysis"

  # API routes for real-time updates
  namespace :api do
    resources :calls, only: [:show] do
      collection do
        get :status
        get :stats
      end
      member do
        get :recording
      end
    end
  end

  # Twilio webhook routes
  namespace :twilio do
    post "voice", to: "twilio#voice"
    post "status", to: "twilio#status"
    post "recording_status", to: "twilio#recording_status"
  end
end
