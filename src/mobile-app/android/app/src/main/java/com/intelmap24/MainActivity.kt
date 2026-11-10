package com.intelmap24

import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    val launchPreferences = getSharedPreferences("intelmap24_launch", 0)
    when (launchPreferences.getString("theme", null)) {
      "light" -> setTheme(R.style.SplashTheme_Light)
      "dark" -> setTheme(R.style.SplashTheme_Dark)
      else -> setTheme(R.style.SplashTheme_Dark)
    }
    val splashScreen = installSplashScreen()
    val splashStartedAt = System.currentTimeMillis()
    splashScreen.setKeepOnScreenCondition {
      !LaunchPreferencesModule.contentReady && System.currentTimeMillis() - splashStartedAt < 5000
    }
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "IntelMap24"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
