export default function LoadingScreen() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

                <p className="text-sm font-medium text-gray-600">
                    Loading...
                </p>
            </div>
        </div>
    );
}