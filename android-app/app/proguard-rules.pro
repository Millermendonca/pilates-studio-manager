# ProGuard rules for Pilates App
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.jetbrains.annotations.Nullable *;
    @org.jetbrains.annotations.NotNull *;
}
-dontwarn kotlinx.serialization.**
-keepclassmembers class * {
    *** Companion;
}
