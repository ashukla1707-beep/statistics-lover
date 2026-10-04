package com.statisticslover.app;

import android.content.Context;
import android.text.InputType;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

final class DeliveryManagerScreen {
    interface BatchOpen {
        void open(String batchId,String batchTitle);
    }

    static ScrollView buildBatches(
            Context context,
            NativeUi ui,
            JSONArray batches,
            Runnable back,
            BatchOpen open
    ){
        ScrollView scroll=ui.page("Lecture delivery","Choose a batch to manage");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        if(batches.length()==0){
            ui.add(body,ui.text(
                    "No manageable batches are available.",
                    15,NativeUi.MUTED,false),16);
        }

        for(int i=0;i<batches.length();i++){
            JSONObject row=batches.optJSONObject(i);
            if(row==null)continue;
            JSONObject course=row.optJSONObject("course");

            LinearLayout card=ui.card();
            if(course!=null){
                card.addView(ui.text(
                        course.optString("title","Course"),
                        16,NativeUi.NAVY,true));
            }
            String title=row.optString("title","Batch");
            card.addView(ui.text(title,13,NativeUi.MUTED,false));
            card.addView(ui.text(
                    row.optString("status",""),
                    11,NativeUi.MAGENTA,true));

            String batchId=row.optString("id","");
            Button manage=ui.button("Manage live & recorded access",true);
            manage.setOnClickListener(v->open.open(batchId,title));
            ui.add(card,manage,10);
            body.addView(card);
        }
        return scroll;
    }

    static ScrollView buildWorkspace(
            Context context,
            NativeUi ui,
            String batchTitle,
            JSONObject data,
            Runnable back,
            Runnable reload,
            Consumer<JSONObject> save,
            BiConsumer<String,String> delete,
            boolean canDelete
    ){
        ScrollView scroll=ui.page(batchTitle,"Live & recorded lecture access");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        JSONArray subjects=array(data,"subjects");
        JSONArray modules=array(data,"modules");
        JSONArray lectures=array(data,"lectures");
        JSONArray sources=array(data,"sources");

        Map<String,String> subjectNames=new HashMap<>();
        for(int i=0;i<subjects.length();i++){
            JSONObject row=subjects.optJSONObject(i);
            if(row!=null)subjectNames.put(row.optString("id"),row.optString("title","Subject"));
        }

        Map<String,JSONObject> moduleMap=new HashMap<>();
        for(int i=0;i<modules.length();i++){
            JSONObject row=modules.optJSONObject(i);
            if(row!=null)moduleMap.put(row.optString("id"),row);
        }

        Map<String,JSONObject> sourceMap=new HashMap<>();
        for(int i=0;i<sources.length();i++){
            JSONObject source=sources.optJSONObject(i);
            if(source==null)continue;
            sourceMap.put(
                    source.optString("lecture_id")+":"+source.optString("action_kind"),
                    source
            );
        }

        if(lectures.length()==0){
            ui.add(body,ui.text(
                    "No lectures are visible in this scope.",
                    15,NativeUi.MUTED,false),16);
        }

        for(int i=0;i<lectures.length();i++){
            JSONObject lecture=lectures.optJSONObject(i);
            if(lecture==null)continue;

            JSONObject module=moduleMap.get(lecture.optString("module_id"));
            String moduleTitle=module==null?"Module":module.optString("title","Module");
            String subjectTitle=module==null?"Subject":
                    subjectNames.getOrDefault(module.optString("subject_id"),"Subject");

            LinearLayout card=ui.card();
            card.addView(ui.text(
                    lecture.optString("title","Lecture"),
                    17,NativeUi.NAVY,true));
            card.addView(ui.text(
                    subjectTitle+" • "+moduleTitle,
                    12,NativeUi.MUTED,false));
            String mode=lecture.optString("delivery_mode","");
            String status=lecture.optString("status","");
            card.addView(ui.text(
                    human(mode)+" • "+human(status),
                    11,NativeUi.MAGENTA,true));

            String scheduled=lecture.optString("scheduled_at","");
            if(!scheduled.isBlank()&&!"null".equals(scheduled)){
                card.addView(ui.text("Scheduled: "+scheduled,11,NativeUi.MUTED,false));
            }

            if("live".equals(mode)||"hybrid".equals(mode)){
                JSONObject source=sourceMap.get(lecture.optString("id")+":join");
                addSourceControl(
                        context,ui,body,card,lecture,"join",source,
                        reload,save,delete,canDelete
                );
            }

            if("recorded".equals(mode)||"hybrid".equals(mode)){
                JSONObject source=sourceMap.get(lecture.optString("id")+":watch");
                addSourceControl(
                        context,ui,body,card,lecture,"watch",source,
                        reload,save,delete,canDelete
                );
            }

            if(!"live".equals(mode)&&!"hybrid".equals(mode)
                    &&!"recorded".equals(mode)){
                ui.add(card,ui.text(
                        "Set this lecture to Live, Recorded or Hybrid before attaching delivery access.",
                        11,NativeUi.MUTED,false),8);
            }

            body.addView(card);
        }

        return scroll;
    }

    private static void addSourceControl(
            Context context,
            NativeUi ui,
            LinearLayout body,
            LinearLayout card,
            JSONObject lecture,
            String actionKind,
            JSONObject source,
            Runnable reload,
            Consumer<JSONObject> save,
            BiConsumer<String,String> delete,
            boolean canDelete
    ){
        String title="join".equals(actionKind)?"Live access":"Recording access";
        String detail=source==null
                ?"Not configured"
                :source.optString("provider","")+" • "+
                source.optString("label",defaultLabel(actionKind));

        ui.add(card,ui.text(title,13,NativeUi.NAVY,true),10);
        card.addView(ui.text(detail,11,source==null?NativeUi.MUTED:NativeUi.GREEN,false));

        if(source!=null){
            String from=source.optString("available_from","");
            String until=source.optString("available_until","");
            if((from!=null&&!from.isBlank()&&!"null".equals(from))
                    ||(until!=null&&!until.isBlank()&&!"null".equals(until))){
                card.addView(ui.text(
                        "Window: "+blank(from,"any time")+" → "+blank(until,"open-ended"),
                        10,NativeUi.MUTED,false));
            }
        }

        Button edit=ui.button(source==null?"Add "+title.toLowerCase():"Edit "+title.toLowerCase(),false);
        edit.setOnClickListener(v->{
            body.removeAllViews();
            Button cancelTop=ui.button("← Back to lectures",false);
            cancelTop.setOnClickListener(x->reload.run());
            body.addView(cancelTop);
            body.addView(sourceForm(
                    context,ui,lecture,actionKind,source,
                    save,delete,canDelete,reload
            ));
        });
        ui.add(card,edit,7);
    }

    private static LinearLayout sourceForm(
            Context context,
            NativeUi ui,
            JSONObject lecture,
            String actionKind,
            JSONObject source,
            Consumer<JSONObject> save,
            BiConsumer<String,String> delete,
            boolean canDelete,
            Runnable cancel
    ){
        LinearLayout form=ui.card();
        form.addView(ui.text(
                "join".equals(actionKind)?"Live access":"Recording access",
                18,NativeUi.NAVY,true));
        form.addView(ui.text(
                lecture.optString("title","Lecture"),
                13,NativeUi.MUTED,false));

        String[] providers="join".equals(actionKind)
                ?new String[]{"google_meet","external"}
                :new String[]{"google_drive","cloudflare_stream","external"};
        Spinner provider=new Spinner(context);
        ArrayAdapter<String> providerAdapter=new ArrayAdapter<>(
                context,android.R.layout.simple_spinner_item,providers);
        providerAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        provider.setAdapter(providerAdapter);
        provider.setSelection(indexOf(
                providers,
                source==null?providers[0]:source.optString("provider",providers[0])
        ));
        ui.add(form,provider,8);

        EditText link=input(context,"Protected HTTPS link",false);
        link.setInputType(
                InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);
        if(source!=null)link.setText(source.optString("provider_reference",""));
        ui.add(form,link,8);

        EditText label=input(context,"Student button label",false);
        label.setText(source==null
                ?defaultLabel(actionKind)
                :source.optString("label",defaultLabel(actionKind)));
        ui.add(form,label,8);

        EditText availableFrom=input(
                context,"Available from — ISO date/time (optional)",false);
        if(source!=null&&!source.isNull("available_from")){
            availableFrom.setText(source.optString("available_from",""));
        }
        ui.add(form,availableFrom,8);

        EditText availableUntil=input(
                context,"Available until — ISO date/time (optional)",false);
        if(source!=null&&!source.isNull("available_until")){
            availableUntil.setText(source.optString("available_until",""));
        }
        ui.add(form,availableUntil,8);

        ui.add(form,ui.text(
                "Examples: 2026-10-04T09:00:00+05:30 or leave blank. "+
                ("join".equals(actionKind)
                        ?"Google Meet links must use meet.google.com."
                        :"Drive links must use drive.google.com."),
                11,NativeUi.MUTED,false),8);

        Button saveButton=ui.button("Save "+("join".equals(actionKind)?"live access":"recording access"),true);
        saveButton.setOnClickListener(v->{
            if(link.getText().toString().trim().isBlank()){
                link.setError("Enter a provider link.");
                return;
            }
            JSONObject payload=new JSONObject();
            try{
                payload.put("lectureId",lecture.optString("id",""));
                payload.put("actionKind",actionKind);
                payload.put("provider",providers[provider.getSelectedItemPosition()]);
                payload.put("providerReference",link.getText().toString());
                payload.put("label",label.getText().toString());
                payload.put("availableFrom",availableFrom.getText().toString());
                payload.put("availableUntil",availableUntil.getText().toString());
            }catch(Exception error){
                link.setError("Could not prepare delivery access.");
                return;
            }
            save.accept(payload);
        });
        ui.add(form,saveButton,10);

        if(source!=null&&canDelete){
            Button remove=ui.button("Remove access",false);
            remove.setOnClickListener(v->delete.accept(
                    lecture.optString("id",""),actionKind));
            ui.add(form,remove,8);
        }

        Button cancelButton=ui.button("Cancel",false);
        cancelButton.setOnClickListener(v->cancel.run());
        ui.add(form,cancelButton,8);
        return form;
    }

    private static EditText input(
            Context context,
            String hint,
            boolean multiline
    ){
        EditText view=new EditText(context);
        view.setHint(hint);
        view.setTextSize(14);
        view.setSingleLine(!multiline);
        if(multiline)view.setMaxLines(5);
        return view;
    }

    private static int indexOf(String[] values,String target){
        for(int i=0;i<values.length;i++){
            if(values[i].equals(target))return i;
        }
        return 0;
    }

    private static String defaultLabel(String actionKind){
        return "join".equals(actionKind)?"Join live class":"Watch recording";
    }

    private static String human(String value){
        return value.replace("_"," ");
    }

    private static String blank(String value,String fallback){
        return value==null||value.isBlank()||"null".equals(value)?fallback:value;
    }

    private static JSONArray array(JSONObject object,String key){
        JSONArray value=object.optJSONArray(key);
        return value==null?new JSONArray():value;
    }
}
