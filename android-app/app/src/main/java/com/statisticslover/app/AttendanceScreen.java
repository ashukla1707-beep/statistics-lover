package com.statisticslover.app;

import android.content.Context;
import android.text.InputFilter;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

final class AttendanceScreen {
    private static final String[] STATUSES={"present","absent","late","excused"};

    interface LectureOpen {
        void open(String lectureId,String lectureTitle);
    }

    private static final class RowEditor {
        final String enrollmentId;
        final Spinner status;
        final EditText note;

        RowEditor(String enrollmentId,Spinner status,EditText note){
            this.enrollmentId=enrollmentId;
            this.status=status;
            this.note=note;
        }
    }

    static ScrollView buildLectures(
            Context context,
            NativeUi ui,
            JSONObject data,
            Runnable back,
            LectureOpen open
    ){
        ScrollView scroll=ui.page("Attendance","Choose a lecture to open its roster");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        JSONArray subjects=array(data,"subjects");
        JSONArray modules=array(data,"modules");
        JSONArray lectures=array(data,"lectures");

        Map<String,JSONObject> subjectMap=new HashMap<>();
        Map<String,JSONObject> moduleMap=new HashMap<>();
        for(int i=0;i<subjects.length();i++){
            JSONObject row=subjects.optJSONObject(i);
            if(row!=null)subjectMap.put(row.optString("id"),row);
        }
        for(int i=0;i<modules.length();i++){
            JSONObject row=modules.optJSONObject(i);
            if(row!=null)moduleMap.put(row.optString("id"),row);
        }

        if(lectures.length()==0){
            ui.add(body,ui.text("No lectures are available in this scope.",15,NativeUi.MUTED,false),16);
        }

        for(int i=0;i<lectures.length();i++){
            JSONObject lecture=lectures.optJSONObject(i);
            if(lecture==null)continue;
            JSONObject module=moduleMap.get(lecture.optString("module_id"));
            JSONObject subject=module==null?null:subjectMap.get(module.optString("subject_id"));
            JSONObject batch=subject==null?null:subject.optJSONObject("batch");
            JSONObject course=batch==null?null:batch.optJSONObject("course");

            LinearLayout card=ui.card();
            String lectureTitle=lecture.optString("title","Lecture");
            card.addView(ui.text(lectureTitle,17,NativeUi.NAVY,true));

            StringBuilder path=new StringBuilder();
            if(course!=null)path.append(course.optString("title",""));
            if(batch!=null){
                if(path.length()>0)path.append(" • ");
                path.append(batch.optString("title",""));
            }
            if(subject!=null){
                if(path.length()>0)path.append(" • ");
                path.append(subject.optString("title",""));
            }
            if(module!=null){
                if(path.length()>0)path.append(" • ");
                path.append(module.optString("title",""));
            }
            if(path.length()>0)card.addView(ui.text(path.toString(),12,NativeUi.MUTED,false));

            String scheduled=lecture.optString("scheduled_at","");
            if(!scheduled.isBlank()&&!"null".equals(scheduled)){
                card.addView(ui.text(scheduled.replace("T"," "),11,NativeUi.MUTED,false));
            }

            String lectureId=lecture.optString("id");
            Button roster=ui.button("Open roster",true);
            roster.setOnClickListener(v->open.open(lectureId,lectureTitle));
            ui.add(card,roster,10);
            body.addView(card);
        }
        return scroll;
    }

    static ScrollView buildRoster(
            Context context,
            NativeUi ui,
            String lectureTitle,
            JSONArray roster,
            Runnable back,
            Consumer<JSONArray> save
    ){
        ScrollView scroll=ui.page(lectureTitle,"Attendance roster");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back to lectures",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        ArrayList<RowEditor> editors=new ArrayList<>();

        if(roster.length()==0){
            ui.add(body,ui.text("No eligible students were found for this lecture.",15,NativeUi.MUTED,false),16);
            return scroll;
        }

        Button allPresent=ui.button("Mark all present",false);
        allPresent.setOnClickListener(v->{
            for(RowEditor editor:editors)editor.status.setSelection(0);
        });
        ui.add(body,allPresent,12);

        for(int i=0;i<roster.length();i++){
            JSONObject row=roster.optJSONObject(i);
            if(row==null)continue;

            String name=row.isNull("full_name")
                    ?row.optString("email","Student")
                    :row.optString("full_name","Student");
            String email=row.optString("email","");
            String enrollmentId=row.optString("enrollment_id","");

            LinearLayout card=ui.card();
            card.addView(ui.text(name,16,NativeUi.NAVY,true));
            if(!email.isBlank()&&!email.equals(name)){
                card.addView(ui.text(email,11,NativeUi.MUTED,false));
            }

            Spinner status=new Spinner(context);
            ArrayAdapter<String> adapter=new ArrayAdapter<>(
                    context,
                    android.R.layout.simple_spinner_item,
                    STATUSES
            );
            adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
            status.setAdapter(adapter);
            status.setSelection(statusIndex(row.optString("attendance_status","present")));
            ui.add(card,status,8);

            EditText note=new EditText(context);
            note.setHint("Optional note");
            note.setText(row.isNull("note")?"":row.optString("note",""));
            note.setTextSize(13);
            note.setSingleLine(false);
            note.setMaxLines(3);
            note.setFilters(new InputFilter[]{new InputFilter.LengthFilter(500)});
            ui.add(card,note,8);

            editors.add(new RowEditor(enrollmentId,status,note));
            body.addView(card);
        }

        Button saveButton=ui.button("Save attendance",true);
        saveButton.setOnClickListener(v->{
            JSONArray updates=new JSONArray();
            for(RowEditor editor:editors){
                JSONObject update=new JSONObject();
                try{
                    update.put("enrollmentId",editor.enrollmentId);
                    update.put("status",STATUSES[editor.status.getSelectedItemPosition()]);
                    update.put("note",editor.note.getText().toString());
                    updates.put(update);
                }catch(Exception ignored){
                    // Values are local primitive strings; this should not fail.
                }
            }
            save.accept(updates);
        });
        ui.add(body,saveButton,4);

        return scroll;
    }

    private static int statusIndex(String value){
        for(int i=0;i<STATUSES.length;i++)if(STATUSES[i].equals(value))return i;
        return 0;
    }

    private static JSONArray array(JSONObject object,String key){
        JSONArray value=object.optJSONArray(key);
        return value==null?new JSONArray():value;
    }
}
