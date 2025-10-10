# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep line numbers for better crash reporting
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# ===== REACT NATIVE RULES =====

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

# TurboModules - Keep PlatformConstants and related
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.PlatformConstants { *; }
-keep class com.facebook.react.modules.systeminfo.** { *; }

# New Architecture (disabled but keep rules)
-keep class com.facebook.react.newarch.** { *; }
-dontwarn com.facebook.react.newarch.**

# Keep React Native bridge
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.devsupport.** { *; }
-keep class com.facebook.react.modules.** { *; }
-keep class com.facebook.react.views.** { *; }

# Keep native methods
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Keep Hermes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ===== FIREBASE RULES =====

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Firestore
-keep class com.google.firebase.firestore.** { *; }
-keep class com.google.firestore.** { *; }
-keepclassmembers class com.google.firebase.firestore.** { *; }

# Firebase Auth
-keep class com.google.firebase.auth.** { *; }
-keepclassmembers class com.google.firebase.auth.** { *; }

# Firebase Storage
-keep class com.google.firebase.storage.** { *; }

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }

# ===== SAMSUNG SPECIFIC RULES =====

# Keep Samsung SDKs (if used)
-keep class com.samsung.** { *; }
-dontwarn com.samsung.**

# ===== JAVASCRIPT ENGINE (JSC/HERMES) =====

# JavaScriptCore
-keep class org.webkit.** { *; }
-dontwarn org.webkit.**

# ===== ASYNC STORAGE =====

-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ===== CRYPTO & SECURITY =====

-keep class org.spongycastle.** { *; }
-dontwarn org.spongycastle.**
-keep class javax.crypto.** { *; }

# ===== OKHTTP & NETWORKING =====

-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ===== FRESCO (Image Library) =====

-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.fresco.** { *; }

# ===== VECTOR ICONS =====

-keep class com.oblador.vectoricons.** { *; }

# ===== GESTURE HANDLER =====

-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# ===== REACT NAVIGATION =====

-keep class com.reactnavigation.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# ===== BIOMETRICS =====

-keep class com.rnbiometrics.** { *; }

# ===== DEVICE INFO =====

-keep class com.learnium.RNDeviceInfo.** { *; }

# ===== IMAGE PICKER =====

-keep class com.imagepicker.** { *; }

# ===== FILE SYSTEM =====

-keep class com.rnfs.** { *; }

# ===== KEYCHAIN =====

-keep class com.oblador.keychain.** { *; }

# ===== PERMISSIONS =====

-keep class com.zoontek.rnpermissions.** { *; }

# ===== GENERAL RULES =====

# Keep GossipIn specific classes
-keep class com.gossipin.** { *; }

# Keep custom native modules
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }

# Keep BuildConfig
-keep class com.gossipin.BuildConfig { *; }

# Keep Parcelable
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}

# Keep Serializable
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ===== OPTIMIZATION RULES =====

# Don't obfuscate - easier debugging (can be removed for final production)
-dontobfuscate

# Don't optimize too aggressively
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-optimizationpasses 5
-allowaccessmodification

# ===== LOGGING (Optional - Uncomment to remove logs in release) =====

# -assumenosideeffects class android.util.Log {
#     public static boolean isLoggable(java.lang.String, int);
#     public static int v(...);
#     public static int i(...);
#     public static int w(...);
#     public static int d(...);
#     public static int e(...);
# }