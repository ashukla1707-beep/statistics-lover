package com.statisticslover.app;

import android.content.Context;
import android.text.InputType;
import android.view.View;
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

final class ResourceManagerScreen {
    interface BatchOpen {
        void open(String batchId,String batchTitle);
    }

    private static final class TargetOption {
        final String scope;
        final String id;
        final String label;

        TargetOption(String scope,String id,String label){
            this.scope=scope;
            this.id=id;
            this.label=label;
        }

        @Override public String toString(){ return label; }
    }

    static ScrollView buildBatches(
            Context context,
            NativeUi ui,
            JSONArray batches,
            Runnable back,
            BatchOpen open
    ){
        ScrollView scroll=ui.page("Study resources","Choose a batch to manage");
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
            Button manage=ui.button("Manage resources",true);
            manage.setOnClickListener(v->open.open(batchId,title));
            ui.add(card,manage,10);
            body.addView(card);
        }
        return scroll;
    }

    static ScrollView buildWorkspace(
            Context context,
            NativeUi ui,
            String batchId,
            String batchTitle,
            String subjectFilter,
            JSONObject data,
            Runnable back,
            Consumer<JSONObject> save
    ){
        ScrollView scroll=ui.page(batchTitle,"Study resources");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        JSONArray subjects=array(data,"subjects");
        JSONArray modules=array(data,"modules");
        JSONArray lectures=array(data,"lectures");
        JSONArray resources=array(data,"resources");
        JSONArray sources=array(data,"sources");

        ArrayList<TargetOption> targets=targets(
                batchTitle,subjectFilter,subjects,modules,lectures);
        Map<String,JSONObject> sourceMap=new HashMap<>();
        for(int i=0;i<sources.length();i++){
            JSONObject source=sources.optJSONObject(i);
            if(source!=null)sourceMap.put(
                    source.optString("resource_id"),source);
        }

        Button create=ui.button("Create resource",true);
        create.setOnClickListener(v->{
            body.removeAllViews();
            body.addView(backButton);
            body.addView(resourceForm(
                    context,ui,batchId,null,null,targets,save,
                    ()->buildWorkspace(
                            context,ui,batchId,batchTitle,subjectFilter,
                            data,back,save
                    )
            ));
        });
        ui.add(body,create,12);

        if(resources.length()==0){
            ui.add(body,ui.text(
                    "No resources are visible in this scope yet.",
                    15,NativeUi.MUTED,false),16);
        }

        Map<String,String> moduleSubjects=new HashMap<>();
        for(int i=0;i<modules.length();i++){
            JSONObject row=modules.optJSONObject(i);
            if(row!=null)moduleSubjects.put(
                    row.optString("id"),row.optString("subject_id"));
        }
        Map<String,String> lectureSubjects=new HashMap<>();
        for(int i=0;i<lectures.length();i++){
            JSONObject row=lectures.optJSONObject(i);
            if(row!=null){
                lectureSubjects.put(
                        row.optString("id"),
                        moduleSubjects.get(row.optString("module_id"))
                );
            }
        }

        for(int i=0;i<resources.length();i++){
            JSONObject row=resources.optJSONObject(i);
            if(row==null)continue;
            JSONObject source=sourceMap.get(row.optString("id"));

            LinearLayout card=ui.card();
            card.addView(ui.text(
                    row.optString("title","Resource"),
                    16,NativeUi.NAVY,true));
            card.addView(ui.text(
                    row.optString("kind","resource")+" • "+
                            row.optString("scope","batch"),
                    12,NativeUi.MAGENTA,true));
            card.addView(ui.text(
                    "Status: "+row.optString("status",""),
                    11,NativeUi.MUTED,false));
            if(source!=null){
                card.addView(ui.text(
                        source.optString("provider","")+" • "+
                                source.optString("action_label","Open"),
                        11,NativeUi.MUTED,false));
            }

            boolean editable=isEditable(
                    row,subjectFilter,moduleSubjects,lectureSubjects);
            if(editable){
                Button edit=ui.button("Edit resource",false);
                edit.setOnClickListener(v->{
                    body.removeAllViews();
                    body.addView(backButton);
                    body.addView(resourceForm(
                            context,ui,batchId,row,source,targets,save,
                            ()->buildWorkspace(
                                    context,ui,batchId,batchTitle,subjectFilter,
                                    data,back,save
                            )
                    ));
                });
                ui.add(card,edit,8);
            }else{
                ui.add(card,ui.text(
                        "Visible for teaching context; this scope is read-only for this assignment.",
                        11,NativeUi.MUTED,false),8);
            }
            body.addView(card);
        }

        return scroll;
    }

    private static LinearLayout resourceForm(
            Context context,
            NativeUi ui,
            String batchId,
            JSONObject resource,
            JSONObject source,
            ArrayList<TargetOption> targets,
            Consumer<JSONObject> save,
            Runnable cancel
    ){
        LinearLayout form=ui.card();
        form.addView(ui.text(
                resource==null?"New resource":"Edit resource",
                18,NativeUi.NAVY,true));

        Spinner target=new Spinner(context);
        ArrayAdapter<TargetOption> targetAdapter=new ArrayAdapter<>(
                context,android.R.layout.simple_spinner_item,targets);
        targetAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        target.setAdapter(targetAdapter);
        target.setSelection(targetIndex(resource,targets));
        ui.add(form,target,8);

        String[] kinds={"study_material","notes","pyq","reference"};
        Spinner kind=new Spinner(context);
        ArrayAdapter<String> kindAdapter=new ArrayAdapter<>(
                context,android.R.layout.simple_spinner_item,kinds);
        kindAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        kind.setAdapter(kindAdapter);
        kind.setSelection(indexOf(
                kinds,resource==null?"study_material":resource.optString("kind","study_material")));
        ui.add(form,kind,8);

        EditText title=input(context,"Title",false);
        if(resource!=null)title.setText(resource.optString("title",""));
        ui.add(form,title,8);

        EditText description=input(context,"Description (optional)",true);
        if(resource!=null&&!resource.isNull("description")){
            description.setText(resource.optString("description",""));
        }
        ui.add(form,description,8);

        String[] statuses={"draft","published","archived"};
        Spinner status=new Spinner(context);
        ArrayAdapter<String> statusAdapter=new ArrayAdapter<>(
                context,android.R.layout.simple_spinner_item,statuses);
        statusAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        status.setAdapter(statusAdapter);
        status.setSelection(indexOf(
                statuses,resource==null?"draft":resource.optString("status","draft")));
        ui.add(form,status,8);

        EditText release=input(context,"Release at ISO time (optional)",false);
        if(resource!=null&&!resource.isNull("release_at")){
            release.setText(resource.optString("release_at",""));
        }
        ui.add(form,release,8);

        EditText position=input(context,"Position",false);
        position.setInputType(InputType.TYPE_CLASS_NUMBER);
        position.setText(String.valueOf(resource==null?0:resource.optInt("position",0)));
        ui.add(form,position,8);

        String[] providers={"google_drive","external"};
        Spinner provider=new Spinner(context);
        ArrayAdapter<String> providerAdapter=new ArrayAdapter<>(
                context,android.R.layout.simple_spinner_item,providers);
        providerAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item);
        provider.setAdapter(providerAdapter);
        provider.setSelection(indexOf(
                providers,source==null?"google_drive":source.optString("provider","google_drive")));
        ui.add(form,provider,8);

        EditText link=input(context,"HTTPS resource link",false);
        link.setInputType(
                InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_URI);
        if(source!=null)link.setText(source.optString("provider_reference",""));
        ui.add(form,link,8);

        EditText label=input(context,"Student button label",false);
        if(source!=null&&!source.isNull("action_label")){
            label.setText(source.optString("action_label",""));
        }
        ui.add(form,label,8);

        Button saveButton=ui.button("Save resource",true);
        saveButton.setOnClickListener(v->{
            if(title.getText().toString().trim().length()<2){
                title.setError("Enter a resource title.");
                return;
            }
            if(link.getText().toString().trim().isBlank()){
                link.setError("Enter the resource link.");
                return;
            }

            int parsedPosition;
            try{
                parsedPosition=Integer.parseInt(
                        position.getText().toString().trim());
                if(parsedPosition<0)throw new NumberFormatException();
            }catch(NumberFormatException error){
                position.setError("Use a non-negative whole number.");
                return;
            }

            TargetOption selected=(TargetOption)target.getSelectedItem();
            JSONObject payload=new JSONObject();
            try{
                payload.put("id",resource==null?"":resource.optString("id",""));
                payload.put("batchId",batchId);
                payload.put("scope",selected.scope);
                payload.put("targetId",selected.id);
                payload.put("kind",kinds[kind.getSelectedItemPosition()]);
                payload.put("title",title.getText().toString());
                payload.put("description",description.getText().toString());
                payload.put("status",statuses[status.getSelectedItemPosition()]);
                payload.put("releaseAt",release.getText().toString());
                payload.put("position",parsedPosition);
                payload.put("provider",providers[provider.getSelectedItemPosition()]);
                payload.put("providerReference",link.getText().toString());
                payload.put("actionLabel",label.getText().toString());
            }catch(Exception error){
                title.setError("Could not prepare resource.");
                return;
            }
            save.accept(payload);
        });
        ui.add(form,saveButton,10);

        Button cancelButton=ui.button("Cancel",false);
        cancelButton.setOnClickListener(v->cancel.run());
        ui.add(form,cancelButton,8);
        return form;
    }

    private static ArrayList<TargetOption> targets(
            String batchTitle,
            String subjectFilter,
            JSONArray subjects,
            JSONArray modules,
            JSONArray lectures
    ){
        ArrayList<TargetOption> result=new ArrayList<>();
        if(subjectFilter==null||subjectFilter.isBlank()){
            result.add(new TargetOption(
                    "batch","", "Batch: "+batchTitle));
        }

        Map<String,String> subjectNames=new HashMap<>();
        for(int i=0;i<subjects.length();i++){
            JSONObject row=subjects.optJSONObject(i);
            if(row==null)continue;
            subjectNames.put(row.optString("id"),row.optString("title","Subject"));
            result.add(new TargetOption(
                    "subject",row.optString("id"),
                    "Subject: "+row.optString("title","Subject")));
        }

        Map<String,String> moduleNames=new HashMap<>();
        for(int i=0;i<modules.length();i++){
            JSONObject row=modules.optJSONObject(i);
            if(row==null)continue;
            moduleNames.put(row.optString("id"),row.optString("title","Module"));
            result.add(new TargetOption(
                    "module",row.optString("id"),
                    "Module: "+row.optString("title","Module")));
        }

        for(int i=0;i<lectures.length();i++){
            JSONObject row=lectures.optJSONObject(i);
            if(row==null)continue;
            result.add(new TargetOption(
                    "lecture",row.optString("id"),
                    "Lecture: "+row.optString("title","Lecture")));
        }
        return result;
    }

    private static boolean isEditable(
            JSONObject resource,
            String subjectFilter,
            Map<String,String> moduleSubjects,
            Map<String,String> lectureSubjects
    ){
        if(subjectFilter==null||subjectFilter.isBlank())return true;

        String scope=resource.optString("scope","");
        if("batch".equals(scope))return false;
        if("subject".equals(scope)){
            return subjectFilter.equals(resource.optString("subject_id"));
        }
        if("module".equals(scope)){
            return subjectFilter.equals(
                    moduleSubjects.get(resource.optString("module_id")));
        }
        if("lecture".equals(scope)){
            return subjectFilter.equals(
                    lectureSubjects.get(resource.optString("lecture_id")));
        }
        return false;
    }

    private static int targetIndex(
            JSONObject resource,
            ArrayList<TargetOption> targets
    ){
        if(resource==null)return 0;
        String scope=resource.optString("scope","batch");
        String id="";
        if("subject".equals(scope))id=resource.optString("subject_id","");
        else if("module".equals(scope))id=resource.optString("module_id","");
        else if("lecture".equals(scope))id=resource.optString("lecture_id","");

        for(int i=0;i<targets.size();i++){
            TargetOption option=targets.get(i);
            if(scope.equals(option.scope)&&id.equals(option.id))return i;
        }
        return 0;
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

    private static JSONArray array(JSONObject object,String key){
        JSONArray value=object.optJSONArray(key);
        return value==null?new JSONArray():value;
    }
}
