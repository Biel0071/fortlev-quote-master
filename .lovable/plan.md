## Proposed Improvements for the Quotation and DANFE System

I will implement a comprehensive set of fixes and enhancements to the quotation management system, focusing on reliability, professional document generation, and a premium responsive experience.

### 1. Robust PNG Download
*   **Fix**: Resolve the "Download PNG" bug by ensuring the generation process properly targets the correct content and triggers a browser-level download.
*   **Process**: Implement a dedicated hidden rendering container to ensure high-quality PNG generation even when the document isn't visible on screen.
*   **Feedback**: Add individual loading indicators for each action (PDF, PNG, DANFE) and explicit toast notifications for success and failure.

### 2. Professional DANFE (NF-e)
*   **Standardization**: Upgrade the DANFE layout to follow the official Brazilian standard (MOC 7.0).
*   **Structure**: Include all mandatory sections:
    *   Receipt acknowledgment (Canhoto) at the top.
    *   Standardized header with Access Key, Barcode, and Protocol.
    *   Complete Tax Calculation block (BC ICMS, IPI, etc.).
    *   Transportation and Volumes block.
    *   Professional density and typography typical of fiscal documents.

### 3. Responsive Preview & Layout
*   **Mobile Preview**: Fix the broken preview on mobile using an intelligent scaling system (CSS transforms) to maintain the A4 aspect ratio without cutting off content.
*   **General Responsiveness**: Refine the dashboard and quotation pages to ensure buttons, tables, and cards adapt perfectly to mobile, tablet, and desktop screens.
*   **Premium Visuals**: Apply subtle enhancements to shadows, borders, and typography to provide a "Premium" feel.

### 4. Streamlined Actions
*   **Reorganization**: Standardize the document generation buttons across the system:
    1.  **Preview**: Quick visual check.
    2.  **Download PDF**: Commercial budget version.
    3.  **Download PNG**: Image version for easy sharing.
    4.  **Download DANFE**: Professional fiscal version.
*   **Validation**: Implement logic to disable the DANFE button if required fiscal data (CNPJ, IE, tax codes) is missing, providing clear guidance to the user.

### Technical Details
*   **Tools**: Using `jspdf` and `jspdf-autotable` for documents, `html2canvas` for PNGs, and Tailwind CSS for the responsive UI.
*   **Branding**: Dynamically load the logo and company data from the `issuing_companies` configuration instead of hardcoded values.
*   **Refactoring**: Centralize document generation logic to avoid duplication and inconsistencies between the dashboard and preview views.

I will begin by fixing the PNG download and reorganizing the buttons, followed by the responsive layout and the professional DANFE upgrade.