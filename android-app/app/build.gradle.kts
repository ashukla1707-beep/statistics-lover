plugins {
    id("com.android.application")
}

val releaseKeystorePath = System.getenv("KEYSTORE_FILE")

android {
    namespace = "com.statisticslover.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.statisticslover.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 23
        versionName = "1.0.22"
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        create("release") {
            if (!releaseKeystorePath.isNullOrBlank()) {
                storeFile = file(releaseKeystorePath)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS")
                keyPassword = System.getenv("KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "APP_URL", "\"https://statistics-lover.vercel.app/\"")
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            if (!releaseKeystorePath.isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "APP_URL", "\"https://statistics-lover.vercel.app/\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.activity:activity:1.10.1")
    implementation("androidx.core:core:1.15.0")
    implementation("androidx.core:core-splashscreen:1.2.0")
}
