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
 *   source ./.setenv && ./scripts/evaluate.sh < scripts/probe_ua_unwind.gs
 */

#include "gciua.hf"
#include <stdio.h>
#include <string.h>

/* The selector each action calls back into.  Defined by the driver script on
 * Object, so any receiver understands it. */
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

extern "C" void GciUserActionInit(void)
{
    GCI_DECLARE_ACTION("uaPerformIgnore",  uaPerformIgnore,  1);
    GCI_DECLARE_ACTION("uaPerformReraise", uaPerformReraise, 1);
    GCI_DECLARE_ACTION("uaPerformNested",  uaPerformNested,  1);
}

extern "C" void GciUserActionShutdown(void) { }
