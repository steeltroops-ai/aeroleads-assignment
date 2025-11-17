# frozen_string_literal: true

##
# Health check controller for monitoring application status.
#
# Provides endpoints for checking application health, database connectivity,
# external service availability, and system metrics.
class HealthController < ApplicationController
  skip_before_action :verify_authenticity_token

  # GET /health
  # Basic health check - returns 200 if app is running
  def index
    render json: {
      status: 'ok',
      timestamp: Time.current.iso8601,
      service: 'autodialer',
      version: ENV['APP_VERSION'] || '1.0.0'
    }
  end

  # GET /health/detailed
  # Detailed health check with component status
  def detailed
    checks = {
      database: check_database,
      redis: check_redis,
      twilio: check_twilio,
      disk_space: check_disk_space,
      memory: check_memory
    }

    all_healthy = checks.values.all? { |check| check[:status] == 'ok' }
    status_code = all_healthy ? 200 : 503

    render json: {
      status: all_healthy ? 'ok' : 'degraded',
      timestamp: Time.current.iso8601,
      checks: checks,
      service: 'autodialer',
      version: ENV['APP_VERSION'] || '1.0.0'
    }, status: status_code
  end

  # GET /health/ready
  # Readiness check - returns 200 when app is ready to serve traffic
  def ready
    ready = check_database[:status] == 'ok'

    if ready
      render json: { status: 'ready', timestamp: Time.current.iso8601 }
    else
      render json: { status: 'not_ready', timestamp: Time.current.iso8601 }, status: 503
    end
  end

  # GET /health/live
  # Liveness check - returns 200 if app is alive (for Kubernetes)
  def live
    render json: { status: 'alive', timestamp: Time.current.iso8601 }
  end

  private

  def check_database
    start_time = Time.current
    ActiveRecord::Base.connection.execute('SELECT 1')
    duration = ((Time.current - start_time) * 1000).round(2)

    {
      status: 'ok',
      response_time_ms: duration
    }
  rescue StandardError => e
    {
      status: 'error',
      error: e.message
    }
  end

  def check_redis
    return { status: 'skipped', message: 'Redis not configured' } unless defined?(Redis)

    start_time = Time.current
    redis = Redis.new(url: ENV['REDIS_URL'] || 'redis://localhost:6379')
    redis.ping
    duration = ((Time.current - start_time) * 1000).round(2)

    {
      status: 'ok',
      response_time_ms: duration
    }
  rescue StandardError => e
    {
      status: 'error',
      error: e.message
    }
  end

  def check_twilio
    return { status: 'skipped', message: 'Twilio not configured' } unless twilio_configured?

    start_time = Time.current
    client = Twilio::REST::Client.new(
      ENV['TWILIO_ACCOUNT_SID'],
      ENV['TWILIO_AUTH_TOKEN']
    )
    # Just check if we can authenticate
    client.api.accounts(ENV['TWILIO_ACCOUNT_SID']).fetch
    duration = ((Time.current - start_time) * 1000).round(2)

    {
      status: 'ok',
      response_time_ms: duration
    }
  rescue StandardError => e
    {
      status: 'error',
      error: e.message
    }
  end

  def check_disk_space
    stat = Sys::Filesystem.stat('/')
    total_gb = (stat.blocks * stat.block_size / 1024.0 / 1024.0 / 1024.0).round(2)
    free_gb = (stat.blocks_available * stat.block_size / 1024.0 / 1024.0 / 1024.0).round(2)
    used_percent = ((total_gb - free_gb) / total_gb * 100).round(2)

    status = used_percent > 90 ? 'warning' : 'ok'

    {
      status: status,
      total_gb: total_gb,
      free_gb: free_gb,
      used_percent: used_percent
    }
  rescue StandardError => e
    {
      status: 'error',
      error: e.message
    }
  end

  def check_memory
    # Get memory info from /proc/meminfo on Linux
    if File.exist?('/proc/meminfo')
      meminfo = File.read('/proc/meminfo')
      total = meminfo.match(/MemTotal:\s+(\d+)/)[1].to_i
      available = meminfo.match(/MemAvailable:\s+(\d+)/)[1].to_i
      
      total_mb = (total / 1024.0).round(2)
      available_mb = (available / 1024.0).round(2)
      used_percent = ((total - available) / total.to_f * 100).round(2)

      status = used_percent > 90 ? 'warning' : 'ok'

      {
        status: status,
        total_mb: total_mb,
        available_mb: available_mb,
        used_percent: used_percent
      }
    else
      { status: 'skipped', message: 'Memory check not available on this platform' }
    end
  rescue StandardError => e
    {
      status: 'error',
      error: e.message
    }
  end

  def twilio_configured?
    ENV['TWILIO_ACCOUNT_SID'].present? && ENV['TWILIO_AUTH_TOKEN'].present?
  end
end
