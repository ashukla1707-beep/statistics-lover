package com.statisticslover.app;

import android.content.Context;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

final class LearningScreen {
    static ScrollView build(
            Context context,
            NativeUi ui,
            String courseTitle,
            String batchTitle,
            JSONObject data,
            Runnable back,
            Consumer<String> openExternal
    ) {
        ScrollView scroll=ui.page(courseTitle,batchTitle);
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back to courses",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        JSONArray subjects=array(data,"subjects");
        JSONArray modules=array(data,"modules");
        JSONArray lectures=array(data,"lectures");
        JSONArray actions=array(data,"actions");

        Map<String,JSONObject> actionMap=new HashMap<>();
        for(int i=0;i<actions.length();i++){
            JSONObject action=actions.optJSONObject(i);
            if(action!=null)actionMap.put(action.optString("lecture_id"),action);
        }

        for(int s=0;s<subjects.length();s++){
            JSONObject subject=subjects.optJSONObject(s);
            if(subject==null)continue;

            TextView subjectTitle=ui.text(subject.optString("title","Subject"),20,NativeUi.NAVY,true);
            ui.add(body,subjectTitle,20);

            String subjectId=subject.optString("id");
            for(int m=0;m<modules.length();m++){
                JSONObject module=modules.optJSONObject(m);
                if(module==null||!subjectId.equals(module.optString("subject_id")))continue;

                ui.add(body,ui.text(module.optString("title","Module"),14,NativeUi.MAGENTA,true),8);
                String moduleId=module.optString("id");

                for(int l=0;l<lectures.length();l++){
                    JSONObject lecture=lectures.optJSONObject(l);
                    if(lecture==null||!moduleId.equals(lecture.optString("module_id")))continue;

                    LinearLayout card=ui.card();
                    card.addView(ui.text(lecture.optString("title","Lecture"),16,NativeUi.NAVY,true));
                    card.addView(ui.text(
                            lecture.optString("status","")+" • "+lecture.optString("delivery_mode",""),
                            11,NativeUi.MUTED,false));

                    String scheduled=lecture.optString("scheduled_at","");
                    if(!scheduled.isBlank()&&!"null".equals(scheduled)){
                        card.addView(ui.text(scheduled.replace("T"," "),11,NativeUi.MUTED,false));
                    }

                    JSONObject action=actionMap.get(lecture.optString("id"));
                    if(action!=null){
                        Button open=ui.button(action.optString("label","Open"),true);
                        String url=action.optString("action_url");
                        open.setOnClickListener(v->openExternal.accept(url));
                        ui.add(card,open,10);
                    }
                    body.addView(card);
                }
            }
        }
        return scroll;
    }

    private static JSONArray array(JSONObject object,String key){
        JSONArray value=object.optJSONArray(key);
        return value==null?new JSONArray():value;
    }
}
