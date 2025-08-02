from django.urls import path
from . import views

app_name = 'voice_assistant'

urlpatterns = [
    path('', views.ai_assistant, name='ai_assistant'),
    path('webrtc-signal/', views.webrtc_signal, name='webrtc_signal'),
] 