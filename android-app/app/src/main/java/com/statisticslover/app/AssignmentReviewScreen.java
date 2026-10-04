package com.statisticslover.app;

import android.content.Context;
import android.text.InputFilter;
import android.text.InputType;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.function.Consumer;

final class AssignmentReviewScreen {
    interface AssignmentOpen {
        void open(String assignmentId,String assignmentTitle,Double maxScore);
    }

    interface GradeAction {
        void grade(String submissionId,String status,Double score,String feedback);
    }

    static ScrollView buildAssignments(
            Context context,
            NativeUi ui,
            JSONArray assignments,
            Runnable back,
            AssignmentOpen open
    ){
        ScrollView scroll=ui.page("Assignments","Review student submissions and grades");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        if(assignments.length()==0){
            ui.add(body,ui.text(
                    "No assignments are available in this scope.",
                    15,NativeUi.MUTED,false),16);
        }

        for(int i=0;i<assignments.length();i++){
            JSONObject row=assignments.optJSONObject(i);
            if(row==null)continue;

            LinearLayout card=ui.card();
            String title=row.optString("title","Assignment");
            card.addView(ui.text(title,17,NativeUi.NAVY,true));

            JSONObject batch=row.optJSONObject("batch");
            JSONObject course=batch==null?null:batch.optJSONObject("course");
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

            card.addView(ui.text(
                    row.optString("scope","assignment")+" • "+contextTitle(row),
                    12,NativeUi.MAGENTA,true));
            card.addView(ui.text(
                    "Status: "+row.optString("status",""),
                    11,NativeUi.MUTED,false));

            String due=row.optString("due_at","");
            if(!due.isBlank()&&!"null".equals(due)){
                card.addView(ui.text(
                        "Due: "+due.replace("T"," "),
                        11,NativeUi.MUTED,false));
            }

            Double maxScore=row.isNull("max_score")
                    ?null:row.optDouble("max_score");
            if(maxScore!=null){
                card.addView(ui.text(
                        "Max score: "+trimNumber(maxScore),
                        11,NativeUi.MUTED,false));
            }

            String assignmentId=row.optString("id","");
            Button review=ui.button("Review submissions",true);
            review.setOnClickListener(v->
                    open.open(assignmentId,title,maxScore));
            ui.add(card,review,10);
            body.addView(card);
        }

        return scroll;
    }

    static ScrollView buildSubmissions(
            Context context,
            NativeUi ui,
            String assignmentTitle,
            Double maxScore,
            JSONArray submissions,
            Runnable back,
            GradeAction grade,
            Consumer<String> openAttachment
    ){
        ScrollView scroll=ui.page(assignmentTitle,"Student submissions");
        LinearLayout body=ui.body(scroll);

        Button backButton=ui.button("← Back to assignments",false);
        backButton.setOnClickListener(v->back.run());
        body.addView(backButton);

        if(submissions.length()==0){
            ui.add(body,ui.text("No submissions yet.",15,NativeUi.MUTED,false),16);
            return scroll;
        }

        for(int i=0;i<submissions.length();i++){
            JSONObject row=submissions.optJSONObject(i);
            if(row==null)continue;

            LinearLayout card=ui.card();
            String name=row.isNull("full_name")
                    ?row.optString("email","Student")
                    :row.optString("full_name","Student");
            String email=row.optString("email","");
            String submissionStatus=row.optString("submission_status","");

            card.addView(ui.text(name,16,NativeUi.NAVY,true));
            if(!email.isBlank()&&!email.equals(name)){
                card.addView(ui.text(email,11,NativeUi.MUTED,false));
            }
            card.addView(ui.text(
                    "Status: "+submissionStatus,
                    11,NativeUi.MAGENTA,true));

            String submitted=row.optString("submitted_at","");
            if(!submitted.isBlank()&&!"null".equals(submitted)){
                card.addView(ui.text(
                        "Submitted: "+submitted.replace("T"," "),
                        11,NativeUi.MUTED,false));
            }

            String submissionText=row.isNull("submission_text")
                    ?"":row.optString("submission_text","");
            if(!submissionText.isBlank()){
                ui.add(card,ui.text(
                        submissionText,13,NativeUi.NAVY,false),8);
            }

            String attachment=row.isNull("attachment_path")
                    ?"":row.optString("attachment_path","");
            if(!attachment.isBlank()){
                Button file=ui.button("Open attachment",false);
                file.setOnClickListener(v->openAttachment.accept(attachment));
                ui.add(card,file,8);
            }

            if("draft".equals(submissionStatus)){
                ui.add(card,ui.text(
                        "This is still a student draft and is not ready for grading.",
                        12,NativeUi.MUTED,false),8);
                body.addView(card);
                continue;
            }

            String[] outcomes={"graded","returned"};
            Spinner outcome=new Spinner(context);
            ArrayAdapter<String> outcomeAdapter=new ArrayAdapter<>(
                    context,android.R.layout.simple_spinner_item,outcomes);
            outcomeAdapter.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item);
            outcome.setAdapter(outcomeAdapter);
            if("returned".equals(submissionStatus))outcome.setSelection(1);
            ui.add(card,outcome,8);

            EditText score=new EditText(context);
            score.setHint(maxScore==null
                    ?"Score (optional)"
                    :"Score / "+trimNumber(maxScore));
            score.setInputType(
                    InputType.TYPE_CLASS_NUMBER|
                    InputType.TYPE_NUMBER_FLAG_DECIMAL);
            score.setSingleLine(true);
            if(!row.isNull("score")){
                score.setText(trimNumber(row.optDouble("score")));
            }
            ui.add(card,score,8);

            EditText feedback=new EditText(context);
            feedback.setHint("Feedback");
            feedback.setSingleLine(false);
            feedback.setMaxLines(5);
            feedback.setFilters(new InputFilter[]{
                    new InputFilter.LengthFilter(5000)
            });
            if(!row.isNull("feedback")){
                feedback.setText(row.optString("feedback",""));
            }
            ui.add(card,feedback,8);

            String submissionId=row.optString("submission_id","");
            Button save=ui.button("Save grade",true);
            save.setOnClickListener(v->{
                String scoreText=score.getText().toString().trim();
                Double parsedScore=null;
                if(!scoreText.isBlank()){
                    try{
                        parsedScore=Double.parseDouble(scoreText);
                    }catch(NumberFormatException error){
                        score.setError("Enter a valid score.");
                        return;
                    }
                }
                if(parsedScore!=null&&parsedScore<0){
                    score.setError("Score cannot be negative.");
                    return;
                }
                if(parsedScore!=null&&maxScore!=null&&parsedScore>maxScore){
                    score.setError(
                            "Score cannot exceed "+trimNumber(maxScore)+".");
                    return;
                }

                grade.grade(
                        submissionId,
                        outcomes[outcome.getSelectedItemPosition()],
                        parsedScore,
                        feedback.getText().toString()
                );
            });
            ui.add(card,save,8);
            body.addView(card);
        }

        return scroll;
    }

    private static String contextTitle(JSONObject row){
        String scope=row.optString("scope","");
        JSONObject value;
        if("subject".equals(scope)) value=row.optJSONObject("subject");
        else if("module".equals(scope)) value=row.optJSONObject("module");
        else if("lecture".equals(scope)) value=row.optJSONObject("lecture");
        else value=row.optJSONObject("batch");

        return value==null
                ?"Batch assignment"
                :value.optString("title","Batch assignment");
    }

    private static String trimNumber(double value){
        if(value==Math.rint(value))return String.valueOf((long)value);
        return String.valueOf(value);
    }
}
