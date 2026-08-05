"""
Driver performance stats aggregation.

Nothing in this codebase previously wrote to Driver.total_trips,
Driver.total_distance_km, or Driver.on_time_performance after a Driver
profile was created -- they were set once (usually to 0 / null via the
auto-created placeholder profile) and never touched again, regardless of
real trip activity. This module is the single place that recalculates
those numbers from real data.

Distance is derived from odometer readings drivers log via location pings
during a trip (tracking.VehicleLocationPing.odometer_km, tagged with
trip_id). If a trip has no odometer readings logged against it, its
distance contribution is 0 -- we do not fabricate a distance figure.

Driver.safety_score is intentionally left alone: there is no telemetry or
incident data anywhere in this app to derive it from, so it stays a
manually-set field until that data exists.
"""
from decimal import Decimal

from django.db.models import Max, Min, F


def _trip_distance_km(trip):
    """Distance covered on a single trip, derived from odometer pings logged during it."""
    from tracking.models import VehicleLocationPing

    odo = VehicleLocationPing.objects.filter(
        trip_id=trip.id, odometer_km__isnull=False
    ).aggregate(max_odo=Max('odometer_km'), min_odo=Min('odometer_km'))

    max_odo, min_odo = odo['max_odo'], odo['min_odo']
    if max_odo is not None and min_odo is not None and max_odo > min_odo:
        return max_odo - min_odo
    return Decimal('0')


def apply_trip_completion_stats(trip):
    """Call once, right when a trip transitions to COMPLETED, to update its driver's stats.

    Uses an atomic F() update (not read-modify-write) so concurrent trip
    completions for the same driver can't clobber each other.
    """
    from fleet.models import Driver

    driver = trip.driver
    if not driver:
        return

    trip_distance = _trip_distance_km(trip)

    Driver.objects.filter(pk=driver.pk).update(
        total_trips=F('total_trips') + 1,
        total_distance_km=F('total_distance_km') + trip_distance,
    )


def recompute_driver_stats(driver):
    """Fully recompute a driver's total_trips / total_distance_km from their completed
    trip history. Unlike apply_trip_completion_stats (an incremental +1 at the moment a
    trip finishes), this rebuilds the numbers from scratch -- use it for a one-off
    backfill so trips completed before this aggregation existed get counted too.
    """
    from fleet.models import Driver
    from dispatch.models import Trip

    completed_trips = Trip.objects.filter(driver=driver, status=Trip.Status.COMPLETED)

    total_trips = completed_trips.count()
    total_distance = sum((_trip_distance_km(trip) for trip in completed_trips), Decimal('0'))

    Driver.objects.filter(pk=driver.pk).update(
        total_trips=total_trips,
        total_distance_km=total_distance,
    )

    return total_trips, total_distance
