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
        versionCode = 3
        versionName = "1.0.2-test"
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "APP_URL", "\"https://statistics-lover-git-develop-statistics-lover.vercel.app/dashboard\"")
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
            buildConfigField("String", "APP_URL", "\"https://statistics-lover.vercel.app/dashboard\"")
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
