plugins {
    id("com.android.application")
}

android {
    namespace = "com.statisticslover.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.statisticslover.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0-test"
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "APP_URL", "\"https://statistics-lover-git-develop-statistics-lover.vercel.app\"")
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "APP_URL", "\"https://statistics-lover.vercel.app\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
}
