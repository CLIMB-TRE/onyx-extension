# Querying Data

Records and analyses share the same interface and functionality for browsing.

![](../../img/records.png)

This includes:

- A `Search` bar, for basic substring matching against visible fields.
- The `Filter` panel, for adding filters against visible, non-visible and nested fields.
- The `Summarise` panel, for computing the number of items per summary group, as specified by the selected fields.
- The :material-content-copy: `Copy CLI Command`, for copying the current filters and summary fields into a command for the Onyx [command-line interface](https://climb-tre.github.io/onyx-client/cli/documentation/#onyx-filter).
- The results panel, `Records` or `Analyses`, that displays results matching the current query. Here, results can be re-ordered, as well as exported via the table `Options` dropdown. The `Edit Columns` button can also be used to change the returned columns.

We will now learn how to filter, aggregate and export data using this interface.

## Filtering Data

### Defining the query

We are going to add filters on the `synthSCAPE` dataset to solve the following problem:

!!! quote "Query"
    Match all synthSCAPE records from 2025 that have a sequence purpose, a run ID of either `R-14EC71EBA7` or `R-F42A056185`, and contain more than 100 reads of `Influenza A Virus`.

This query can be broken down into the following criteria:

1. The `published_date` must be greater than or equal to `2025-01-01`.
2. The `sequence_purpose` must not be blank.
3. The `run_id` must be either `R-14EC71EBA7` or `R-F42A056185`.
4. Each record's `classifier_calls` must contain _at least_ one entry matching the condition:
    - `(human_readable == 'Influenza A Virus') AND (count_descendants >= 100)`
     
### Building the query

To add a new filter, click the :material-pencil: icon on the `Filter` panel:

![](../../img/filter.png)

This creates an empty filter with the title `Click to Edit`.

![](../../img/empty_filter.png)

Clicking on the filter will open its settings:

![](../../img/edit_filter.png)

We will edit the filter as following;

- Set the `field` to `published_date`.
- Set the `lookup` to `gte` (greater than or equal).
- Set the `value` to `2025-01-01`.

![](../../img/published_date_filter.png)

Then hit `Apply` to filter to the dataset:

![](../../img/published_date_results.png)

As we can see, the dataset has been filtered to records with a `published_date` greater than `2025-01-01`.

!!! tip
    In this example, we have used the `gte` (greater than or equal) lookup for `published_date`. However, we could also use the `iso_year` lookup and set this to `2025` instead. 

## Aggregating Data

## Exporting Data

## Transferring to the Onyx CLI

