package com.gossipin

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "GossipAppFixed"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private fun emitKeyEvent(eventName: String, keyCode: Int) {
    val reactContext = reactInstanceManager?.currentReactContext ?: return
    val params = Arguments.createMap().apply {
      putInt("keyCode", keyCode)
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      // Only emit on the initial press, ignore auto-repeat events
      if (event?.repeatCount == 0) {
        emitKeyEvent("hardwareKeyDown", keyCode)
      }
      return true // consume the event so volume doesn't change
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
      emitKeyEvent("hardwareKeyUp", keyCode)
      return true
    }
    return super.onKeyUp(keyCode, event)
  }
}
