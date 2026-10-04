package com.statisticslover.app;

import android.content.Context;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;

import org.json.JSONArray;
import org.json.JSONObject;

final class AssessmentOpsScreen {
    interface TestOpen {
        void open(String testId,String testTitle);
    }

    interface ScheduleToggle {
        void toggle(String scheduleId,boolean value);
    }

    static ScrollView buildTests(
            Context context,
            NativeUi ui,
            JSONArray tests,
            Runnable back,
            TestOpen open
    ){
        ScrollView scroll=ui.page("Tests & results","Native assessment operations");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        if(tests.length()==0){
            ui.add(body,ui.text(
                    "No tests are available in this scope.",
                    15,NativeUi.MUTED,false),16);
        }

        for(int i=0;i<tests.length();i++){
            JSONObject row=tests.optJSONObject(i);
            if(row==null)continue;

            LinearLayout card=ui.card();
            String title=row.optString("title","Test");
            card.addView(ui.text(title,17,NativeUi.NAVY,true));

            JSONObject batch=row.optJSONObject("batch");
            JSONObject course=batch==null?null:batch.optJSONObject("course");
            JSONObject subject=row.optJSONObject("subject");
            if(course!=null){
                card.addView(ui.text(
                        course.optString("title","Course"),
                        12,NativeUi.MUTED,false));
            }
            if(batch!=null){
                card.addView(ui.text(
                        batch.optString("title","Batch"),
                        12,NativeUi.MUTED,false));
            }

            String scope=row.optString("scope","batch");
            String contextLabel="batch";
            if("subject".equals(scope)&&subject!=null){
                contextLabel=subject.optString("title","Subject");
            }
            card.addView(ui.text(
                    scope+" • "+contextLabel,
                    12,NativeUi.MAGENTA,true));
            card.addView(ui.text(
                    "Status: "+row.optString("status",""),
                    11,NativeUi.MUTED,false));

            if(!row.isNull("duration_minutes")){
                card.addView(ui.text(
                        row.optInt("duration_minutes")+" min • "+
                                row.optInt("max_attempts",1)+" attempt(s)",
                        11,NativeUi.MUTED,false));
            }

            String testId=row.optString("id","");
            Button manage=ui.button("Schedules & analytics",true);
            manage.setOnClickListener(v->open.open(testId,title));
            ui.add(card,manage,10);
            body.addView(card);
        }
        return scroll;
    }

    static ScrollView buildDetail(
            Context context,
            NativeUi ui,
            String testTitle,
            JSONArray schedules,
            JSONObject analytics,
            Runnable back,
            ScheduleToggle activeToggle,
            ScheduleToggle resultToggle
    ){
        ScrollView scroll=ui.page(testTitle,"Schedules, results and performance");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back to tests",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        JSONObject summary=analytics.optJSONObject("summary");
        if(summary==null)summary=new JSONObject();

        LinearLayout metrics=ui.card();
        metrics.addView(ui.text("Performance",12,NativeUi.MAGENTA,true));
        metrics.addView(ui.text(
                summary.optInt("attempt_count",0)+" attempts • "+
                        summary.optInt("student_count",0)+" students",
                16,NativeUi.NAVY,true));
        metrics.addView(ui.text(
                "Average "+format(summary.optDouble("average_percentage",0))+
                        "% • High "+format(summary.optDouble("highest_percentage",0))+
                        "% • Low "+format(summary.optDouble("lowest_percentage",0))+"%",
                12,NativeUi.MUTED,false));
        body.addView(metrics);

        if(schedules.length()==0){
            ui.add(body,ui.text(
                    "No schedules have been created for this test yet.",
                    15,NativeUi.MUTED,false),16);
            return scroll;
        }

        for(int i=0;i<schedules.length();i++){
            JSONObject row=schedules.optJSONObject(i);
            if(row==null)continue;

            LinearLayout card=ui.card();
            String title=row.isNull("title")
                    ?"Test schedule"
                    :row.optString("title","Test schedule");
            card.addView(ui.text(title,16,NativeUi.NAVY,true));
            card.addView(ui.text(
                    row.optBoolean("is_active")?"ACTIVE":"PAUSED",
                    11,row.optBoolean("is_active")?NativeUi.GREEN:NativeUi.MUTED,true));
            card.addView(ui.text(
                    "Audience: "+row.optString("audience","batch")+
                            " • Results: "+row.optString("result_policy","immediate"),
                    12,NativeUi.MUTED,false));
            card.addView(ui.text(
                    "Opens: "+cleanTime(row.optString("opens_at","")),
                    11,NativeUi.MUTED,false));
            card.addView(ui.text(
                    "Closes: "+cleanTime(row.optString("closes_at","")),
                    11,NativeUi.MUTED,false));

            String scheduleId=row.optString("id","");
            boolean active=row.optBoolean("is_active");
            Button activeButton=ui.button(
                    active?"Pause schedule":"Activate schedule",
                    false
            );
            activeButton.setOnClickListener(v->
                    activeToggle.toggle(scheduleId,!active));
            ui.add(card,activeButton,8);

            if("manual".equals(row.optString("result_policy",""))){
                boolean released=row.optBoolean("manual_results_released");
                card.addView(ui.text(
                        released?"Manual results are released.":"Manual results are hidden.",
                        12,released?NativeUi.GREEN:NativeUi.MUTED,true));
                Button release=ui.button(
                        released?"Hide results":"Release results",
                        true
                );
                release.setOnClickListener(v->
                        resultToggle.toggle(scheduleId,!released));
                ui.add(card,release,8);
            }

            body.addView(card);
        }
        return scroll;
    }

    private static String cleanTime(String value){
        if(value==null||value.isBlank()||"null".equals(value))return "—";
        return value.replace("T"," ");
    }

    private static String format(double value){
        return String.format(java.util.Locale.US,"%.1f",value);
    }
}
