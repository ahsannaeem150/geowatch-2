package com.intelmap24

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LaunchPreferencesModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  companion object {
    @JvmStatic
    @Volatile
    var contentReady = false
  }

  override fun getName(): String = "LaunchPreferences"

  @ReactMethod
  fun setReady(ready: Boolean) {
    contentReady = ready
  }

  @ReactMethod
  fun setTheme(theme: String) {
    val value = if (theme == "light") "light" else "dark"
    reactApplicationContext
      .getSharedPreferences("intelmap24_launch", 0)
      .edit()
      .putString("theme", value)
      .apply()
  }
}
