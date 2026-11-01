#include <unity.h>
#include "reliability.h"
void setUp() {}
void tearDown() {}
void buffer_is_bounded_and_preserves_capture_order() {
  voltarax::Ring<int, 3> buffer;
  for (int value = 1; value <= 5; value++) buffer.push(value);
  TEST_ASSERT_EQUAL(3, buffer.size()); TEST_ASSERT_EQUAL(2, buffer.dropped);
  for (int expected = 3; expected <= 5; expected++) { TEST_ASSERT_EQUAL(expected, buffer.front()); buffer.pop(); }
  TEST_ASSERT_TRUE(buffer.empty()); buffer.pop(); TEST_ASSERT_TRUE(buffer.empty());
}
void retry_delays_are_bounded_and_handle_millis_wrap() {
  voltarax::Backoff retry;
  TEST_ASSERT_TRUE(retry.due(0)); retry.fail(0); TEST_ASSERT_FALSE(retry.due(999)); TEST_ASSERT_TRUE(retry.due(1000));
  for (int attempt = 0; attempt < 20; attempt++) retry.fail(1000);
  TEST_ASSERT_EQUAL(60000, retry.wait);
  retry.last = UINT32_MAX - 500; retry.wait = 1000; TEST_ASSERT_TRUE(retry.due(500));
  retry.reset(); TEST_ASSERT_TRUE(retry.due(500));
}
void invalid_sensor_values_and_unsynced_time_are_not_measurements() {
  TEST_ASSERT_FALSE(voltarax::validReading(NAN, 0, 100)); TEST_ASSERT_FALSE(voltarax::validReading(INFINITY, 0, 100));
  TEST_ASSERT_FALSE(voltarax::validReading(-1, 0, 100)); TEST_ASSERT_FALSE(voltarax::validReading(101, 0, 100));
  TEST_ASSERT_TRUE(voltarax::validReading(0, 0, 100)); TEST_ASSERT_FALSE(voltarax::clockReady(0)); TEST_ASSERT_TRUE(voltarax::clockReady(1700000000));
}
int main() {
  UNITY_BEGIN(); RUN_TEST(buffer_is_bounded_and_preserves_capture_order); RUN_TEST(retry_delays_are_bounded_and_handle_millis_wrap); RUN_TEST(invalid_sensor_values_and_unsynced_time_are_not_measurements); return UNITY_END();
}
