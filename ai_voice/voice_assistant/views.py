import os
import json

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import requests
from dotenv import load_dotenv

load_dotenv()


OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime"



def ai_assistant(request):
    return render(request, 'voice_assistant/ai_assistant.html')


# Create your views here.
@csrf_exempt
def webrtc_signal(request):
    """Secure WebRTC signaling endpoint that proxies to OpenAI"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    api_key = getattr(settings, 'OPENAI_API_KEY', os.environ.get('OPENAI_API_KEY'))
    if not api_key:
        return JsonResponse({'error': 'OpenAI API key not configured'}, status=500)

    try:
        try:
            request_data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)

        sdp_offer = request_data.get('sdp')
        session_params = request_data.get('session_params', {})
        
        if not sdp_offer:
            return JsonResponse({'error': 'SDP offer not provided in request body'}, status=400)

        model = session_params.get('model', 'gpt-4o-realtime-preview-2024-12-17')
        speed = session_params.get('speed')

        # Configure the standard API URL for realtime
        api_url = f"{OPENAI_REALTIME_URL}?model={model}"
        if speed:
            api_url += f"&speed={speed}"

        response = requests.post(
            api_url,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/sdp',
                'OpenAI-Beta': 'realtime=v1'
            },
            data=sdp_offer,
            timeout=30
        )

        response.raise_for_status()

        sdp_answer = response.text
        
        return JsonResponse({
            'sdp': sdp_answer,
            'session_data': session_params
        })

    except requests.exceptions.HTTPError as http_err:
        error_content = "Unknown error"
        try:
            error_content = http_err.response.json() if http_err.response else str(http_err)
        except json.JSONDecodeError:
            error_content = http_err.response.text if http_err.response else str(http_err)
        return JsonResponse({'error': 'OpenAI API error', 'details': error_content},
                            status=(http_err.response.status_code if http_err.response else 500))
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=500)