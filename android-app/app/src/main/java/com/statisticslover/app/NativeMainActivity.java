package com.statisticslover.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public class NativeMainActivity extends AppCompatActivity {
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Set<String> roles=new HashSet<>();

    private NativeApiClient api;
    private NativeUi ui;
    private LinearLayout root;
    private FrameLayout content;
    private LinearLayout nav;
    private String screen="login";

    private JSONObject profile=new JSONObject();
    private JSONObject summary=new JSONObject();
    private JSONArray enrollments=new JSONArray();
    private JSONArray orders=new JSONArray();
    private JSONArray teacherAssignments=new JSONArray();

    @Override
    protected void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        api=new NativeApiClient(this);
        ui=new NativeUi(this);
        createRoot();
        configureBack();
        if(api.session().hasSession()) bootstrap(); else showLogin();
    }

    private void createRoot(){
        root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(NativeUi.BG);
        ViewCompat.setOnApplyWindowInsetsListener(root,(v,i)->{
            Insets b=i.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(b.left,b.top,b.right,b.bottom);
            return i;
        });
        content=new FrameLayout(this);
        root.addView(content,new LinearLayout.LayoutParams(-1,0,1f));
        setContentView(root);
    }

    private void configureBack(){
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override public void handleOnBackPressed(){
                if("login".equals(screen)) finish();
                else if("home".equals(screen)) moveTaskToBack(true);
                else showHome();
            }
        });
    }

    private void replace(View view){
        content.removeAllViews();
        content.addView(view,new FrameLayout.LayoutParams(-1,-1));
    }

    private void busy(String message){
        screen="busy";
        LinearLayout box=new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.addView(new ProgressBar(this));
        ui.add(box,ui.text(message,14,NativeUi.MUTED,false),12);
        replace(box);
    }

    private void showLogin(){
        screen="login";
        root.removeAllViews();
        content=new FrameLayout(this);
        root.addView(content,new LinearLayout.LayoutParams(-1,0,1f));
        nav=null;
        replace(LoginScreen.build(this,ui,(email,credential)->{
            if(email.isBlank()||credential.isBlank()){
                toast("Enter email and password.");
                return;
            }
            busy("Signing in…");
            io.execute(()->{
                try{
                    api.signIn(email,credential);
                    runOnUiThread(this::bootstrap);
                }catch(Exception error){
                    runOnUiThread(()->{
                        showLogin();
                        toast(message(error));
                    });
                }
            });
        }));
    }

    private void bootstrap(){
        busy("Loading your account…");
        io.execute(()->{
            try{
                JSONObject data=api.bootstrap();
                profile=data.optJSONObject("profile");
                if(profile==null||!"active".equals(profile.optString("account_status"))){
                    throw new Exception("This account is not active.");
                }

                roles.clear();
                JSONArray roleRows=array(data,"roles");
                for(int i=0;i<roleRows.length();i++) roles.add(roleRows.optString(i));

                enrollments=array(data,"enrollments");
                orders=array(data,"orders");
                teacherAssignments=array(data,"teacherAssignments");
                summary=data.optJSONObject("notificationSummary");
                if(summary==null)summary=new JSONObject();

                runOnUiThread(()->{
                    buildChrome();
                    showHome();
                });
            }catch(Exception error){
                runOnUiThread(()->{
                    api.signOut();
                    showLogin();
                    toast(message(error));
                });
            }
        });
    }

    private void buildChrome(){
        root.removeAllViews();

        LinearLayout top=new LinearLayout(this);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(ui.dp(18),ui.dp(8),ui.dp(10),ui.dp(8));
        top.setBackgroundColor(Color.WHITE);
        top.addView(ui.text("Statistics Lover",20,NativeUi.NAVY,true),
                new LinearLayout.LayoutParams(0,-2,1f));

        Button logout=ui.button("Logout",false);
        logout.setOnClickListener(v->{
            api.signOut();
            showLogin();
        });
        top.addView(logout,new LinearLayout.LayoutParams(ui.dp(92),ui.dp(44)));
        root.addView(top);

        content=new FrameLayout(this);
        root.addView(content,new LinearLayout.LayoutParams(-1,0,1f));

        nav=new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setBackgroundColor(Color.WHITE);

        addNav("Home",this::showHome);
        addNav("Courses",this::showCourses);
        addNav("Inbox",this::showInbox);
        addNav("Orders",this::showOrders);
        if(roles.contains("teacher")) addNav("Teach",this::showTeacher);
        else if(hasOperationsRole()) addNav("Ops",this::showOperations);
        else addNav("Store",this::showStore);

        root.addView(nav,new LinearLayout.LayoutParams(-1,ui.dp(62)));
    }

    private void addNav(String label,Runnable action){
        Button button=new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextSize(11);
        button.setTextColor(NativeUi.NAVY);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setOnClickListener(v->action.run());
        nav.addView(button,new LinearLayout.LayoutParams(0,-1,1f));
    }

    private void showHome(){
        screen="home";
        String name=profile.optString("full_name","");
        if(name.isBlank()||"null".equals(name)) name=api.session().email();

        ScrollView scroll=ui.page("Welcome, "+name,"Your native Statistics Lover dashboard");
        LinearLayout body=ui.body(scroll);

        LinearLayout role=ui.card();
        role.addView(ui.text("Roles",12,NativeUi.MAGENTA,true));
        role.addView(ui.text(roles.isEmpty()?"student":String.join(" • ",roles),15,NativeUi.NAVY,true));
        body.addView(role);

        metric(body,"Enrolled batches",String.valueOf(enrollments.length()),"Open Courses to study");
        metric(body,"Unread notifications",String.valueOf(summary.optInt("unread_count",0)),"Open Inbox to review");
        metric(body,"Orders",String.valueOf(orders.length()),"Payment and receipt status");
        if(roles.contains("teacher")){
            metric(body,"Teaching assignments",String.valueOf(teacherAssignments.length()),"Active teaching scope");
        }

        Button coursesButton=ui.button("Open my courses",true);
        coursesButton.setOnClickListener(v->showCourses());
        ui.add(body,coursesButton,4);

        Button storeButton=ui.button("Browse course store",false);
        storeButton.setOnClickListener(v->showStore());
        ui.add(body,storeButton,10);

        replace(scroll);
    }

    private void metric(LinearLayout body,String label,String value,String note){
        LinearLayout card=ui.card();
        card.addView(ui.text(label,12,NativeUi.MUTED,true));
        card.addView(ui.text(value,28,NativeUi.NAVY,true));
        card.addView(ui.text(note,12,NativeUi.MUTED,false));
        body.addView(card);
    }

    private void showCourses(){
        screen="courses";
        ScrollView scroll=ui.page("My courses","Your enrolled batches");
        LinearLayout body=ui.body(scroll);

        if(enrollments.length()==0){
            body.addView(ui.text("No active enrollment yet.",15,NativeUi.MUTED,false));
        }

        for(int i=0;i<enrollments.length();i++){
            JSONObject row=enrollments.optJSONObject(i);
            JSONObject batch=row==null?null:row.optJSONObject("batch");
            JSONObject course=batch==null?null:batch.optJSONObject("course");
            if(batch==null||course==null)continue;

            LinearLayout card=ui.card();
            card.addView(ui.text(course.optString("title","Course"),18,NativeUi.NAVY,true));
            card.addView(ui.text(batch.optString("title","Batch"),13,NativeUi.MUTED,false));
            card.addView(ui.text(row.optString("status",""),11,NativeUi.MAGENTA,true));

            String batchId=batch.optString("id");
            String courseTitle=course.optString("title","Course");
            String batchTitle=batch.optString("title","Batch");
            Button open=ui.button("Open learning",true);
            open.setOnClickListener(v->showLearning(batchId,courseTitle,batchTitle));
            ui.add(card,open,10);
            body.addView(card);
        }

        replace(scroll);
    }

    private void showLearning(String batchId,String courseTitle,String batchTitle){
        busy("Loading "+batchTitle+"…");
        io.execute(()->{
            try{
                JSONObject data=api.learning(batchId);
                runOnUiThread(()->replace(
                        LearningScreen.build(
                                this,ui,courseTitle,batchTitle,data,
                                this::showCourses,
                                this::openExternal
                        )
                ));
                screen="learning";
            }catch(Exception error){
                runOnUiThread(()->{
                    showCourses();
                    toast(message(error));
                });
            }
        });
    }

    private void showInbox(){
        busy("Loading inbox…");
        io.execute(()->{
            try{
                JSONObject data=api.notifications();
                JSONArray rows=array(data,"notifications");
                runOnUiThread(()->renderInbox(rows));
            }catch(Exception error){
                runOnUiThread(()->{
                    showHome();
                    toast(message(error));
                });
            }
        });
    }

    private void renderInbox(JSONArray rows){
        screen="inbox";
        ScrollView scroll=ui.page("Notifications","Announcements and account updates");
        LinearLayout body=ui.body(scroll);

        Button mark=ui.button("Mark all read",false);
        mark.setOnClickListener(v->{
            busy("Updating inbox…");
            io.execute(()->{
                try{
                    api.markAllRead();
                    JSONObject fresh=api.notifications();
                    runOnUiThread(()->renderInbox(array(fresh,"notifications")));
                }catch(Exception error){
                    runOnUiThread(()->toast(message(error)));
                }
            });
        });
        body.addView(mark);

        if(rows.length()==0)ui.add(body,ui.text("You are all caught up.",15,NativeUi.MUTED,false),12);

        for(int i=0;i<rows.length();i++){
            JSONObject row=rows.optJSONObject(i);
            if(row==null)continue;
            LinearLayout card=ui.card();
            card.addView(ui.text(row.optString("title","Notification"),16,NativeUi.NAVY,true));
            card.addView(ui.text(row.optString("body",""),13,NativeUi.MUTED,false));
            body.addView(card);
        }

        replace(scroll);
    }

    private void showOrders(){
        busy("Loading orders…");
        io.execute(()->{
            try{
                JSONObject data=api.orders();
                orders=array(data,"orders");
                runOnUiThread(()->renderOrders(orders));
            }catch(Exception error){
                runOnUiThread(()->{
                    showHome();
                    toast(message(error));
                });
            }
        });
    }

    private void renderOrders(JSONArray rows){
        screen="orders";
        ScrollView scroll=ui.page("My orders","Payment verification and receipts");
        LinearLayout body=ui.body(scroll);
        NumberFormat money=NumberFormat.getCurrencyInstance(new Locale("en","IN"));

        if(rows.length()==0)body.addView(ui.text("No orders yet.",15,NativeUi.MUTED,false));

        for(int i=0;i<rows.length();i++){
            JSONObject row=rows.optJSONObject(i);
            if(row==null)continue;
            JSONObject batch=row.optJSONObject("batch");
            JSONObject course=batch==null?null:batch.optJSONObject("course");

            LinearLayout card=ui.card();
            card.addView(ui.text(row.optString("order_number","Order"),12,NativeUi.MAGENTA,true));
            card.addView(ui.text(course==null?"Course":course.optString("title","Course"),17,NativeUi.NAVY,true));
            card.addView(ui.text(
                    money.format(row.optLong("total_minor",0)/100.0)+" • "+row.optString("status",""),
                    13,
                    "paid".equals(row.optString("status"))?NativeUi.GREEN:NativeUi.MUTED,
                    true
            ));
            body.addView(card);
        }

        replace(scroll);
    }

    private void showStore(){
        busy("Loading store…");
        io.execute(()->{
            try{
                JSONObject data=api.offers();
                JSONArray offers=array(data,"offers");
                runOnUiThread(()->replace(
                        StoreScreen.build(
                                this,ui,offers,
                                (batchId,coupon)->createOrder(batchId,coupon),
                                this::showHome
                        )
                ));
                screen="store";
            }catch(Exception error){
                runOnUiThread(()->{
                    showHome();
                    toast(message(error));
                });
            }
        });
    }

    private void createOrder(String batchId,String coupon){
        busy("Creating order…");
        io.execute(()->{
            try{
                api.createOrder(batchId,coupon);
                JSONObject data=api.orders();
                orders=array(data,"orders");
                runOnUiThread(()->{
                    toast("Order created.");
                    renderOrders(orders);
                });
            }catch(Exception error){
                runOnUiThread(()->{
                    showStore();
                    toast(message(error));
                });
            }
        });
    }

    private void showTeacher(){
        screen="teacher";
        ScrollView scroll=ui.page("Teacher workspace","Your active teaching scope");
        LinearLayout body=ui.body(scroll);

        if(teacherAssignments.length()==0){
            body.addView(ui.text("No active teaching assignment.",15,NativeUi.MUTED,false));
        }

        for(int i=0;i<teacherAssignments.length();i++){
            JSONObject row=teacherAssignments.optJSONObject(i);
            if(row==null)continue;
            LinearLayout card=ui.card();
            card.addView(ui.text(
                    row.isNull("subject_id")?"Whole-batch scope":"Subject scope",
                    12,NativeUi.MAGENTA,true));
            card.addView(ui.text("Batch: "+row.optString("batch_id",""),13,NativeUi.NAVY,false));
            if(!row.isNull("subject_id")){
                card.addView(ui.text("Subject: "+row.optString("subject_id",""),13,NativeUi.NAVY,false));
            }
            body.addView(card);
        }

        LinearLayout note=ui.card();
        note.addView(ui.text("Native teaching modules",16,NativeUi.NAVY,true));
        note.addView(ui.text(
                "Attendance, grading, tests and content-management workflows are the next native Android layer.",
                12,NativeUi.MUTED,false));
        body.addView(note);

        replace(scroll);
    }

    private void showOperations(){
        busy("Loading operations…");
        io.execute(()->{
            try{
                JSONObject data=api.operationsCourses();
                JSONArray courses=array(data,"courses");
                runOnUiThread(()->renderOperations(courses));
            }catch(Exception error){
                runOnUiThread(()->{
                    showHome();
                    toast(message(error));
                });
            }
        });
    }

    private void renderOperations(JSONArray courses){
        screen="operations";
        ScrollView scroll=ui.page("Operations","Role-aware native workspace");
        LinearLayout body=ui.body(scroll);

        LinearLayout access=ui.card();
        access.addView(ui.text("Access",12,NativeUi.MAGENTA,true));
        access.addView(ui.text(String.join(" • ",roles),15,NativeUi.NAVY,true));
        access.addView(ui.text(courses.length()+" courses visible in your scope",12,NativeUi.MUTED,false));
        body.addView(access);

        String[] modules=(roles.contains("admin")||roles.contains("owner"))
                ? new String[]{"Academics","Content","Enrollments","Assignments","Attendance","Tests","Announcements","Commerce","Staff","Audit","Settings"}
                : new String[]{"Academics","Content","Assignments","Attendance","Tests","Announcements"};

        for(String module:modules){
            LinearLayout card=ui.card();
            card.addView(ui.text(module,16,NativeUi.NAVY,true));
            card.addView(ui.text("Native management workflow will be added in the next Android layer.",12,NativeUi.MUTED,false));
            body.addView(card);
        }

        replace(scroll);
    }

    private boolean hasOperationsRole(){
        return roles.contains("content_manager")||roles.contains("admin")||roles.contains("owner");
    }

    private void openExternal(String url){
        ExternalActions.open(this,url);
    }

    private JSONArray array(JSONObject object,String key){
        JSONArray value=object.optJSONArray(key);
        return value==null?new JSONArray():value;
    }

    private String message(Exception error){
        String value=error.getMessage();
        return value==null||value.isBlank()?"Something went wrong.":value;
    }

    private void toast(String value){
        Toast.makeText(this,value,Toast.LENGTH_LONG).show();
    }

    @Override
    protected void onDestroy(){
        io.shutdownNow();
        super.onDestroy();
    }
}
