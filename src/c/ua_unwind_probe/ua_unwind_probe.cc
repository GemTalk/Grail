/* ua_unwind_probe.c -- minimal GemStone user action library for
 * docs/GemStone_Feature_Requests.md 1.5: "Unwind across user-action and
 * C-primitive frames" (errors 2758 ERR_EXC_RETURN_DISALLOWED / 2079
 * RT_ERR_CANT_RETURN).
 *
 * PURPOSE.  Give the GemStone team a reproducible case that does NOT depend on
 * Grail, CPython, or numpy.  Everything here is GCI: one library, three actions,
 * driven by scripts/probe_ua_unwind.gs.
 *
 * THE QUESTION.  A Smalltalk handler installed OUTSIDE a user action wants to
 * recover (ex return:) from an exception raised INSIDE Smalltalk code that the
 * user action called back into.  Doing so must unwind across this C frame.  Is
 * that permitted, and if not, is the refusal reported as something a caller can
 * translate?
 *
 * THE THREE ACTIONS differ only in what the C code does after the callback
 * raises, because that is the variable we cannot guess:
 *
 *   uaPerformIgnore   GciPerform a raising selector, IGNORE the trapped error,
 *                     return normally.  Tests whether the exception is delivered
 *                     to Smalltalk at the action boundary at all.
 *   uaPerformReraise  GciPerform, then GciRaiseException with the trapped error,
 *                     which the header describes as returning control to
 *                     Smalltalk from within a user action.
 *   uaPerformNested   GciPerform a selector that itself performs a second
 *                     callback before raising, so the raise is two Smalltalk
 *                     activations above this C frame rather than one.
 *
 * BUILD (Darwin; on Linux use -shared and .so):
 *   c++ -Wall -fPIC -O2 -I$GEMSTONE/include -dynamiclib \
 *      -undefined dynamic_lookup -o libua_unwind_probe.dylib \
 *      ua_unwind_probe.cc $GEMSTONE/lib/gciualib.o
 *
 * gciualib.o is REQUIRED: it supplies GciUserActionLibMain, the entry point
 * GciLoadUserActionLibrary looks up with dlsym.  Without it the load fails with
 * error 2171, "could not find GciUserActionLibMain", and every action then fails
 * with 2358, "not registered".  Use the Makefile beside this file.
 *
 * RUN:
 *   source ./.setenv && topaz -l -I .topazini -S scripts/probe_ua_unwind.gs
 *
 * That files in class Kermit52015 (one class-side method, probe_ua_unwind) and
 * runs it once.  The class is committed, so a later session re-runs the probe
 * with just  Kermit52015 probe_ua_unwind.
 */

#include "gciua.hf"
#include <stdio.h>
#include <string.h>

/* The selector each action calls back into.  Defined by the driver script on a
 * throwaway class (UaProbeSubject), an instance of which is the receiver each
 * action is passed. */
static const char *kRaiseSelector  = "uaProbeRaise";
static const char *kNestedSelector = "uaProbeRaiseNested";

/* Did the last GciPerform leave an error?  Report it on stderr so the C side's
 * view is visible next to the Smalltalk side's. */
static int report_gci_error(const char *where)
{
    GciErrSType err;
    if (GciErr(&err)) {
        fprintf(stderr, "[ua_unwind_probe] %s: GciErr number=%d category=%llu "
                        "message=%s\n",
                where, err.number, (unsigned long long) err.category,
                err.message);
        fflush(stderr);
        return 1;
    }
    fprintf(stderr, "[ua_unwind_probe] %s: GciPerform returned with NO error\n",
            where);
    fflush(stderr);
    return 0;
}

/* 1. Ignore the trapped error and return normally. */
static OopType uaPerformIgnore(OopType receiver)
{
    OopType result = GciPerform(receiver, kRaiseSelector, NULL, 0);
    report_gci_error("uaPerformIgnore");
    return result;
}

/* 2. Re-raise the trapped error from inside the user action. */
static OopType uaPerformReraise(OopType receiver)
{
    GciErrSType err;
    OopType result = GciPerform(receiver, kRaiseSelector, NULL, 0);
    if (GciErr(&err)) {
        fprintf(stderr, "[ua_unwind_probe] uaPerformReraise: re-raising %d\n",
                err.number);
        fflush(stderr);
        GciRaiseException(&err);           /* returns control to Smalltalk */
        return OOP_NIL;                    /* not reached if it unwinds */
    }
    return result;
}

/* 3. Raise two Smalltalk activations above this frame. */
static OopType uaPerformNested(OopType receiver)
{
    OopType result = GciPerform(receiver, kNestedSelector, NULL, 0);
    report_gci_error("uaPerformNested");
    return result;
}

/* 4. THE exceptionObj PROBE.
 *
 * The three actions above only ever printed err.number, err.category and
 * err.message, so they never actually answered the obvious question: does
 * GciErrSType carry the exception that was signalled?  err.exceptionObj is
 * right there in the struct.
 *
 * This action performs an ARBITRARY selector (passed as a String, so one
 * build covers many flavours of raise), then reports every field of the
 * GciErrSType and HANDS err.exceptionObj BACK TO SMALLTALK as its return
 * value.  The driver then asks that object what class it is and what its
 * messageText says -- which is the whole question, decided by Smalltalk
 * rather than by a C printf.
 *
 * Returns the trapped exceptionObj, or OOP_NIL if there was no error (or the
 * error carried no exceptionObj). */
static OopType uaExcObj(OopType receiver, OopType selectorOop)
{
    char sel[128];
    int64 n = GciFetchSize_(selectorOop);
    if (n < 0 || n >= (int64) sizeof(sel)) n = sizeof(sel) - 1;
    GciFetchBytes_(selectorOop, 1, (ByteType *) sel, n);
    sel[n] = '\0';

    OopType result = GciPerform(receiver, sel, NULL, 0);

    GciErrSType err;
    if (!GciErr(&err)) {
        fprintf(stderr, "[ua_unwind_probe] uaExcObj(%s): NO ERROR, result=%llu\n",
                sel, (unsigned long long) result);
        fflush(stderr);
        return result;          /* hand the value back, so this doubles as a
                                   way to FETCH something from Smalltalk --
                                   e.g. `Processor activeProcess` */
    }
    fprintf(stderr,
        "[ua_unwind_probe] uaExcObj(%s):\n"
        "    number       = %d\n"
        "    fatal        = %d\n"
        "    exceptionObj = %llu\n"
        "    category     = %llu\n"
        "    context      = %llu%s\n"
        "    argCount     = %d\n"
        "    args[0]      = %llu\n"
        "    message      = '%s'\n"
        "    reason       = '%s'\n",
        sel, err.number, (int) err.fatal,
        (unsigned long long) err.exceptionObj,
        (unsigned long long) err.category,
        (unsigned long long) err.context,
        err.context == OOP_NIL ? "   <-- OOP_NIL (0x14): NO process, so"
                                 " GciContinueWith has nothing to continue" : "",
        err.argCount,
        (unsigned long long) (err.argCount > 0 ? err.args[0] : OOP_ILLEGAL),
        err.message, err.reason);
    fflush(stderr);
    return err.exceptionObj;
}

/* 6. DOES GciContinueWith HELP?  The idea: if we knew the green-thread
 *    process, could we hand a value back to the caller's on:do: without
 *    unwinding across this C frame?
 *
 *    We CAN get the process -- `Processor activeProcess` performed from in
 *    here answers the very GsProcess the caller is running on.  So
 *    availability is not the obstacle.  This action gets the process FIRST
 *    (before any error, so the perform is clean), then makes a callback that
 *    raises, then calls GciContinueWith(process, value, 0, &err) and reports
 *    what happened.
 *
 *    Note GciContinueWith documents `process` as coming from the CONTEXT
 *    FIELD of an error report -- and inside a user action that field is
 *    OOP_NIL (0x14), which the dump above flags.  That is the tell: the API
 *    is for a CLIENT resuming a gem's SUSPENDED process after an error was
 *    reported out to it.  Here the process is not suspended; it is the one
 *    executing us. */
static OopType uaTryContinueWith(OopType receiver, OopType valueOop)
{
    OopType proc = GciPerform(receiver, "currentProcess", NULL, 0);
    GciErrSType e0;
    if (GciErr(&e0)) {
        fprintf(stderr, "[ua_unwind_probe] uaTryContinueWith: could not get "
                        "process: %d\n", e0.number);
        fflush(stderr);
        return OOP_NIL;
    }
    fprintf(stderr, "[ua_unwind_probe] uaTryContinueWith: process oop=%llu\n",
            (unsigned long long) proc);

    (void) GciPerform(receiver, kRaiseSelector, NULL, 0);
    GciErrSType err;
    if (!GciErr(&err)) {
        fprintf(stderr, "[ua_unwind_probe] uaTryContinueWith: callback did not "
                        "raise?\n");
        fflush(stderr);
        return OOP_NIL;
    }
    fprintf(stderr, "[ua_unwind_probe] uaTryContinueWith: trapped %d, "
                    "err.context=%llu; calling GciContinueWith(proc, value)\n",
            err.number, (unsigned long long) err.context);
    fflush(stderr);

    GciErrSType cwErr;
    cwErr.init();
    OopType res = GciContinueWith(proc, valueOop, 0, &cwErr);
    fprintf(stderr, "[ua_unwind_probe] uaTryContinueWith: GciContinueWith "
                    "returned %llu, cwErr.number=%d msg='%s'\n",
            (unsigned long long) res, cwErr.number, cwErr.message);
    fflush(stderr);
    return res;
}

/* 5. THE MINIMAL USER ACTION, for reference: take two SmallIntegers, do some
 *    math, answer a SmallInteger.  This IS the whole return convention -- an
 *    ordinary C `return` of an OopType.  GciDeclareAction (via
 *    GCI_DECLARE_ACTION) registers a function of nargs OopType arguments
 *    returning OopType, and whatever it returns becomes the value of
 *        System userAction: #uaAddTwo with: a with: b
 *    There is no "return" GCI call and none is needed.
 *
 *    The contrast worth keeping in mind: GciRaiseException is the OTHER way
 *    out, and it UNWINDS this C frame before signalling in the caller's
 *    context.  Between them the two directions are covered -- answer a value,
 *    or raise -- which is why there is no GciNbReturn to go looking for. */
static OopType uaAddTwo(OopType aOop, OopType bOop)
{
    int64 a = GciOopToI64(aOop);
    int64 b = GciOopToI64(bOop);
    return GciI64ToOop(a * b + 1);          /* some math */
}

extern "C" void GciUserActionInit(void)
{
    GCI_DECLARE_ACTION("uaPerformIgnore",  uaPerformIgnore,  1);
    GCI_DECLARE_ACTION("uaPerformReraise", uaPerformReraise, 1);
    GCI_DECLARE_ACTION("uaPerformNested",  uaPerformNested,  1);
    GCI_DECLARE_ACTION("uaExcObj",         uaExcObj,         2);
    GCI_DECLARE_ACTION("uaAddTwo",         uaAddTwo,         2);
    GCI_DECLARE_ACTION("uaTryContinueWith", uaTryContinueWith, 2);
}

extern "C" void GciUserActionShutdown(void) { }
