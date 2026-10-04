import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const publicClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const userClient = (token: string) =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

function requireToken(body: Record<string, unknown>) {
  const token = typeof body.accessToken === "string" ? body.accessToken : "";
  if (!token) throw new Error("Authentication required.");
  return token;
}

async function bootstrap(token: string) {
  const client = userClient(token);
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) throw userError ?? new Error("Invalid session.");
  const user = userData.user;

  const [profileResult, rolesResult, enrollmentsResult, summaryResult, ordersResult] =
    await Promise.all([
      client.from("profiles")
        .select("id,full_name,phone,avatar_url,account_status")
        .eq("id", user.id)
        .maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", user.id),
      client.from("enrollments").select(`
        id,status,enrolled_at,access_ends_at,
        batch:batches!enrollments_batch_id_fkey(
          id,title,slug,status,starts_on,ends_on,
          course:courses!batches_course_id_fkey(id,title,slug,thumbnail_url)
        )
      `).eq("student_id", user.id)
        .in("status", ["active", "completed"])
        .order("enrolled_at", { ascending: false }),
      client.rpc("get_my_notification_summary"),
      client.from("commerce_orders").select(`
        id,order_number,batch_id,currency,subtotal_minor,discount_minor,total_minor,coupon_code,status,provider,
        provider_payment_reference,expires_at,paid_at,created_at,
        batch:batches!commerce_orders_batch_id_fkey(title,course:courses!batches_course_id_fkey(title)),
        receipt:commerce_receipts!commerce_receipts_order_id_fkey(receipt_number,issued_at)
      `).eq("student_id", user.id).order("created_at", { ascending: false }),
    ]);

  for (const result of [profileResult, rolesResult, enrollmentsResult, summaryResult, ordersResult]) {
    if (result.error) throw result.error;
  }

  const roles = (rolesResult.data ?? []).map((row: { role: string }) => row.role);
  let teacherAssignments: unknown[] = [];
  if (roles.includes("teacher")) {
    const assignmentResult = await client.from("teacher_assignments")
      .select(`
        id,batch_id,subject_id,starts_at,ends_at,is_active,
        batch:batches!teacher_assignments_batch_id_fkey(
          id,title,course:courses!batches_course_id_fkey(id,title)
        ),
        subject:subjects!teacher_assignments_subject_id_fkey(id,title)
      `)
      .eq("teacher_id", user.id)
      .eq("is_active", true)
      .order("created_at");
    if (assignmentResult.error) throw assignmentResult.error;
    teacherAssignments = assignmentResult.data ?? [];
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profileResult.data,
    roles,
    enrollments: enrollmentsResult.data ?? [],
    notificationSummary: (summaryResult.data ?? [])[0] ?? { unread_count: 0, total_count: 0 },
    orders: ordersResult.data ?? [],
    teacherAssignments,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "signIn") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return json({
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        userId: data.user?.id ?? null,
        email: data.user?.email ?? null,
      });
    }

    if (action === "signUp") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      const fullName = String(body.fullName ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const { data, error } = await publicClient().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone: phone || null } },
      });
      if (error) throw error;
      return json({
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        userId: data.user?.id ?? null,
        email: data.user?.email ?? null,
        confirmationRequired: !data.session,
      });
    }

    if (action === "recover") {
      const email = String(body.email ?? "").trim();
      const { error } = await publicClient().auth.resetPasswordForEmail(email, {
        redirectTo: "https://statistics-lover.vercel.app/reset-password",
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "refresh") {
      const refreshToken = String(body.refreshToken ?? "");
      const { data, error } = await publicClient().auth.refreshSession({ refresh_token: refreshToken });
      if (error) throw error;
      return json({
        accessToken: data.session?.access_token ?? null,
        refreshToken: data.session?.refresh_token ?? null,
        userId: data.user?.id ?? null,
        email: data.user?.email ?? null,
      });
    }

    if (action === "bootstrap") {
      return json(await bootstrap(requireToken(body)));
    }

    if (action === "notifications") {
      const client = userClient(requireToken(body));
      const { data, error } = await client.from("in_app_notifications")
        .select("id,kind,title,body,action_url,available_at,expires_at,read_at,created_at")
        .order("available_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ notifications: data ?? [] });
    }

    if (action === "markAllRead") {
      const client = userClient(requireToken(body));
      const { error } = await client.rpc("mark_all_notifications_read");
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "orders") {
      const client = userClient(requireToken(body));
      const { data: userData, error: userError } = await client.auth.getUser(requireToken(body));
      if (userError || !userData.user) throw userError ?? new Error("Invalid session.");
      const { data, error } = await client.from("commerce_orders").select(`
        id,order_number,batch_id,currency,subtotal_minor,discount_minor,total_minor,coupon_code,status,provider,
        provider_payment_reference,expires_at,paid_at,created_at,
        batch:batches!commerce_orders_batch_id_fkey(title,course:courses!batches_course_id_fkey(title)),
        receipt:commerce_receipts!commerce_receipts_order_id_fkey(receipt_number,issued_at)
      `).eq("student_id", userData.user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ orders: data ?? [] });
    }

    if (action === "offers") {
      const { data, error } = await publicClient().rpc("get_public_batch_offers");
      if (error) throw error;
      return json({ offers: data ?? [] });
    }

    if (action === "createOrder") {
      const client = userClient(requireToken(body));
      const { data, error } = await client.rpc("create_commerce_order", {
        target_batch: String(body.batchId ?? ""),
        coupon_code: String(body.couponCode ?? "").trim() || null,
        payment_provider: "manual",
      });
      if (error) throw error;
      return json({ orderId: data });
    }

    if (action === "learning") {
      const token = requireToken(body);
      const client = userClient(token);
      const batchId = String(body.batchId ?? "");

      const { data: subjects, error: subjectError } = await client.from("subjects")
        .select("id,title,code,description,position")
        .eq("batch_id", batchId).eq("status", "published")
        .order("position").order("title");
      if (subjectError) throw subjectError;

      const subjectIds = (subjects ?? []).map((row: { id: string }) => row.id);
      let modules: unknown[] = [];
      let lectures: unknown[] = [];
      if (subjectIds.length) {
        const moduleResult = await client.from("modules")
          .select("id,subject_id,title,description,position")
          .in("subject_id", subjectIds).eq("status", "published")
          .order("position").order("title");
        if (moduleResult.error) throw moduleResult.error;
        modules = moduleResult.data ?? [];

        const moduleIds = (modules as Array<{ id: string }>).map((row) => row.id);
        if (moduleIds.length) {
          const lectureResult = await client.from("lectures")
            .select("id,module_id,title,description,status,delivery_mode,position,scheduled_at,duration_minutes,release_at")
            .in("module_id", moduleIds)
            .in("status", ["scheduled", "live", "published"])
            .order("position").order("title");
          if (lectureResult.error) throw lectureResult.error;
          lectures = lectureResult.data ?? [];
        }
      }

      const actionResult = await client.rpc("get_batch_delivery_actions", { target_batch: batchId });
      if (actionResult.error) throw actionResult.error;

      return json({
        subjects: subjects ?? [],
        modules,
        lectures,
        actions: actionResult.data ?? [],
      });
    }


    if (action === "attendanceLectures") {
      const client = userClient(requireToken(body));
      const batchId = String(body.batchId ?? "").trim();
      const subjectId = String(body.subjectId ?? "").trim();

      let subjectQuery = client.from("subjects").select(`
        id,batch_id,title,code,position,
        batch:batches!subjects_batch_id_fkey(
          id,title,course:courses!batches_course_id_fkey(id,title)
        )
      `).order("position").order("title");
      if (batchId) subjectQuery = subjectQuery.eq("batch_id", batchId);
      if (subjectId) subjectQuery = subjectQuery.eq("id", subjectId);

      const { data: subjects, error: subjectError } = await subjectQuery;
      if (subjectError) throw subjectError;

      const subjectIds = (subjects ?? []).map((row: { id: string }) => row.id);
      let modules: unknown[] = [];
      let lectures: unknown[] = [];

      if (subjectIds.length) {
        const moduleResult = await client.from("modules")
          .select("id,subject_id,title,position")
          .in("subject_id", subjectIds)
          .order("position").order("title");
        if (moduleResult.error) throw moduleResult.error;
        modules = moduleResult.data ?? [];

        const moduleIds = (modules as Array<{ id: string }>).map((row) => row.id);
        if (moduleIds.length) {
          const lectureResult = await client.from("lectures")
            .select("id,module_id,title,status,delivery_mode,scheduled_at,position")
            .in("module_id", moduleIds)
            .order("scheduled_at", { ascending: false })
            .order("position").order("title");
          if (lectureResult.error) throw lectureResult.error;
          lectures = lectureResult.data ?? [];
        }
      }

      return json({ subjects: subjects ?? [], modules, lectures });
    }

    if (action === "attendanceRoster") {
      const client = userClient(requireToken(body));
      const lectureId = String(body.lectureId ?? "").trim();
      if (!lectureId) throw new Error("Lecture is required.");
      const { data, error } = await client.rpc("get_attendance_roster", {
        target_lecture: lectureId,
      });
      if (error) throw error;
      return json({ roster: data ?? [] });
    }

    if (action === "saveAttendance") {
      const client = userClient(requireToken(body));
      const lectureId = String(body.lectureId ?? "").trim();
      if (!lectureId) throw new Error("Lecture is required.");

      const inputRows = Array.isArray(body.rows)
        ? body.rows as Array<Record<string, unknown>>
        : [];
      if (!inputRows.length) throw new Error("Attendance rows are required.");

      const allowed = new Set(["present", "absent", "late", "excused"]);
      const payload = inputRows.map((row) => {
        const enrollmentId = String(row.enrollmentId ?? "").trim();
        const status = String(row.status ?? "").trim();
        const note = String(row.note ?? "").trim();

        if (!enrollmentId) throw new Error("Enrollment is required.");
        if (!allowed.has(status)) throw new Error("Invalid attendance status.");
        if (note.length > 500) throw new Error("Attendance note is too long.");

        return {
          lecture_id: lectureId,
          enrollment_id: enrollmentId,
          status,
          note: note || null,
        };
      });

      const { error } = await client.from("lecture_attendance").upsert(payload, {
        onConflict: "lecture_id,enrollment_id",
      });
      if (error) throw error;

      const rosterResult = await client.rpc("get_attendance_roster", {
        target_lecture: lectureId,
      });
      if (rosterResult.error) throw rosterResult.error;
      return json({ ok: true, roster: rosterResult.data ?? [] });
    }


    if (action === "managedAssignments") {
      const client = userClient(requireToken(body));
      const batchId = String(body.batchId ?? "").trim();

      let query = client.from("assignments").select(`
        id,batch_id,scope,subject_id,module_id,lecture_id,title,instructions,status,
        release_at,due_at,allow_late,max_score,position,created_at,
        batch:batches!assignments_batch_id_fkey(
          id,title,course:courses!batches_course_id_fkey(id,title)
        ),
        subject:subjects!assignments_subject_id_fkey(id,title),
        module:modules!assignments_module_id_fkey(id,title),
        lecture:lectures!assignments_lecture_id_fkey(id,title)
      `).order("created_at", { ascending: false }).limit(200);

      if (batchId) query = query.eq("batch_id", batchId);

      const { data, error } = await query;
      if (error) throw error;
      return json({ assignments: data ?? [] });
    }

    if (action === "assignmentSubmissions") {
      const client = userClient(requireToken(body));
      const assignmentId = String(body.assignmentId ?? "").trim();
      if (!assignmentId) throw new Error("Assignment is required.");

      const { data, error } = await client.rpc("get_assignment_submissions", {
        target_assignment: assignmentId,
      });
      if (error) throw error;
      return json({ submissions: data ?? [] });
    }

    if (action === "gradeSubmission") {
      const client = userClient(requireToken(body));
      const assignmentId = String(body.assignmentId ?? "").trim();
      const submissionId = String(body.submissionId ?? "").trim();
      const status = String(body.status ?? "").trim();
      const feedback = String(body.feedback ?? "").trim();

      if (!assignmentId || !submissionId) throw new Error("Submission is required.");
      if (status !== "graded" && status !== "returned") {
        throw new Error("Invalid grading status.");
      }
      if (feedback.length > 5000) throw new Error("Feedback is too long.");

      const rawScore = body.score;
      let score: number | null = null;
      if (rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== "") {
        score = Number(rawScore);
        if (!Number.isFinite(score) || score < 0) throw new Error("Invalid score.");
      }

      const { error } = await client.from("assignment_submissions").update({
        status,
        score,
        feedback: feedback || null,
      }).eq("id", submissionId);
      if (error) throw error;

      const fresh = await client.rpc("get_assignment_submissions", {
        target_assignment: assignmentId,
      });
      if (fresh.error) throw fresh.error;
      return json({ ok: true, submissions: fresh.data ?? [] });
    }

    if (action === "submissionSignedUrl") {
      const client = userClient(requireToken(body));
      const path = String(body.path ?? "").trim();
      if (!path) throw new Error("Attachment path is required.");

      const { data, error } = await client.storage
        .from("assignment-submissions")
        .createSignedUrl(path, 60 * 15);
      if (error) throw error;
      return json({ url: data.signedUrl });
    }


    if (action === "assessmentTests") {
      const client = userClient(requireToken(body));
      const batchId = String(body.batchId ?? "").trim();

      let query = client.from("assessment_tests").select(`
        id,batch_id,scope,subject_id,title,description,status,duration_minutes,
        max_attempts,shuffle_questions,shuffle_options,created_at,
        batch:batches!assessment_tests_batch_id_fkey(
          id,title,course:courses!batches_course_id_fkey(id,title)
        ),
        subject:subjects!assessment_tests_subject_id_fkey(id,title)
      `).order("created_at", { ascending: false }).limit(200);

      if (batchId) query = query.eq("batch_id", batchId);

      const { data, error } = await query;
      if (error) throw error;
      return json({ tests: data ?? [] });
    }

    if (action === "assessmentSchedules") {
      const client = userClient(requireToken(body));
      const testId = String(body.testId ?? "").trim();
      if (!testId) throw new Error("Test is required.");

      const { data, error } = await client.from("assessment_test_schedules")
        .select("id,test_id,title,opens_at,closes_at,audience,result_policy,results_release_at,is_active,manual_results_released")
        .eq("test_id", testId)
        .order("opens_at", { ascending: false });
      if (error) throw error;
      return json({ schedules: data ?? [] });
    }

    if (action === "setScheduleActive") {
      const client = userClient(requireToken(body));
      const scheduleId = String(body.scheduleId ?? "").trim();
      const active = body.active === true;
      if (!scheduleId) throw new Error("Schedule is required.");

      const { error } = await client.from("assessment_test_schedules")
        .update({ is_active: active })
        .eq("id", scheduleId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "setManualResultsReleased") {
      const client = userClient(requireToken(body));
      const scheduleId = String(body.scheduleId ?? "").trim();
      const released = body.released === true;
      if (!scheduleId) throw new Error("Schedule is required.");

      const { error } = await client.rpc("set_manual_assessment_results_released", {
        target_schedule: scheduleId,
        target_released: released,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "assessmentAnalytics") {
      const client = userClient(requireToken(body));
      const testId = String(body.testId ?? "").trim();
      if (!testId) throw new Error("Test is required.");

      const { data, error } = await client.rpc("get_assessment_test_analytics", {
        target_test: testId,
      });
      if (error) throw error;
      return json({ analytics: data ?? {} });
    }

    if (action === "operationsCourses") {
      const client = userClient(requireToken(body));
      const { data, error } = await client.from("courses")
        .select("id,title,slug,status,description").order("title");
      if (error) throw error;
      return json({ courses: data ?? [] });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return json({ error: message }, 400);
  }
});
