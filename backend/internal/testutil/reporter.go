package testutil

import (
	"fmt"
	"testing"
	"time"
)

// WorkflowReporter logs business workflow steps during tests
type WorkflowReporter struct {
	t        *testing.T
	testName string
	steps    []StepResult
}

// StepResult represents the outcome of a workflow step
type StepResult struct {
	Name     string
	Status   string // "pass", "fail", "skip"
	Duration time.Duration
	Details  string
}

// NewWorkflowReporter creates a new workflow reporter for a test
func NewWorkflowReporter(t *testing.T) *WorkflowReporter {
	return &WorkflowReporter{
		t:        t,
		testName: t.Name(),
		steps:    make([]StepResult, 0),
	}
}

// Step logs and executes a workflow step
func (r *WorkflowReporter) Step(name string, fn func() error) error {
	start := time.Now()
	r.t.Logf("[STEP] %s", name)

	err := fn()
	duration := time.Since(start)

	step := StepResult{Name: name, Duration: duration}
	if err != nil {
		step.Status = "fail"
		step.Details = err.Error()
		r.t.Logf("  [FAIL] %v (%v)", err, duration)
		r.t.Errorf("Step '%s' failed: %v", name, err)
	} else {
		step.Status = "pass"
		r.t.Logf("  [OK] (%v)", duration)
	}
	r.steps = append(r.steps, step)
	return err
}

// StepNoFail logs and executes a workflow step but doesn't fail the test on error
func (r *WorkflowReporter) StepNoFail(name string, fn func() error) error {
	start := time.Now()
	r.t.Logf("[STEP] %s", name)

	err := fn()
	duration := time.Since(start)

	step := StepResult{Name: name, Duration: duration}
	if err != nil {
		step.Status = "fail"
		step.Details = err.Error()
		r.t.Logf("  [FAIL] %v (%v)", err, duration)
	} else {
		step.Status = "pass"
		r.t.Logf("  [OK] (%v)", duration)
	}
	r.steps = append(r.steps, step)
	return err
}

// Check logs an assertion with expected/actual values
func (r *WorkflowReporter) Check(name string, expected, actual interface{}, passed bool) bool {
	if passed {
		r.t.Logf("    [CHECK OK] %s: %v", name, actual)
	} else {
		r.t.Logf("    [CHECK FAIL] %s: expected %v, got %v", name, expected, actual)
		r.t.Errorf("Check '%s' failed: expected %v, got %v", name, expected, actual)
	}
	return passed
}

// CheckNoFail logs an assertion but doesn't fail the test
func (r *WorkflowReporter) CheckNoFail(name string, expected, actual interface{}, passed bool) bool {
	if passed {
		r.t.Logf("    [CHECK OK] %s: %v", name, actual)
	} else {
		r.t.Logf("    [CHECK FAIL] %s: expected %v, got %v", name, expected, actual)
	}
	return passed
}

// Info logs informational message within a step
func (r *WorkflowReporter) Info(format string, args ...interface{}) {
	r.t.Logf("    [INFO] %s", fmt.Sprintf(format, args...))
}

// GetSteps returns all recorded steps
func (r *WorkflowReporter) GetSteps() []StepResult {
	return r.steps
}

// Summary prints a summary of all steps
func (r *WorkflowReporter) Summary() {
	r.t.Log("")
	r.t.Log("=== TEST SUMMARY ===")
	r.t.Logf("Test: %s", r.testName)
	r.t.Log("---")

	passed := 0
	failed := 0
	var totalDuration time.Duration

	for _, step := range r.steps {
		totalDuration += step.Duration
		status := "[OK]"
		if step.Status == "fail" {
			status = "[FAIL]"
			failed++
		} else {
			passed++
		}
		r.t.Logf("%s %s (%v)", status, step.Name, step.Duration)
	}

	r.t.Log("---")
	r.t.Logf("Total: %d passed, %d failed, %v", passed, failed, totalDuration)
	r.t.Log("====================")
}
